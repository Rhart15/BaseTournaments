import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { persistAccountStatus } from "@/lib/connect";
import { recordDiscountCodeUse, markInstallmentPaid } from "@/lib/pricing";

// A checkout session is either a single registration (metadata.registrationId),
// a cart of several registered together (metadata.orderGroupId), or the
// first installment of a payment plan (metadata.installmentId). Marks
// whichever one it refers to PAID and records discount code use.
async function markPaid(session: Stripe.Checkout.Session) {
  const { registrationId, orderGroupId, installmentId } = session.metadata ?? {};

  if (installmentId) {
    // Record which PaymentIntent settled this first installment so a
    // later refund can find the charge (off-session installments store
    // their own id; this one is paid via Checkout).
    if (typeof session.payment_intent === "string") {
      await prisma.paymentInstallment.updateMany({
        where: { id: installmentId, stripePaymentIntentId: null },
        data: { stripePaymentIntentId: session.payment_intent },
      });
    }
    await markInstallmentPaid(installmentId);
    return;
  }

  if (orderGroupId) {
    const registrations = await prisma.registration.findMany({
      where: { orderGroupId },
    });
    await prisma.registration.updateMany({
      where: { orderGroupId },
      data: { status: "PAID", paidAt: new Date() },
    });
    for (const r of registrations) {
      await recordDiscountCodeUse(r.discountCodeId);
    }
    return;
  }

  if (registrationId) {
    const registration = await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await recordDiscountCodeUse(registration.discountCodeId);
  }
}

async function revertToPending(session: Stripe.Checkout.Session) {
  const { registrationId, orderGroupId, installmentId } = session.metadata ?? {};

  if (installmentId) {
    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: { status: "FAILED" },
    });
    return;
  }
  if (orderGroupId) {
    await prisma.registration.updateMany({
      where: { orderGroupId },
      data: { status: "PENDING" },
    });
    return;
  }
  if (registrationId) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "PENDING" },
    });
  }
}

// Stripe requires the raw request body to verify the webhook signature,
// so this route must not run through any body-parsing middleware.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Card payments confirm instantly, so checkout.session.completed already
  // means "paid" -- but ACH (us_bank_account) settles asynchronously over
  // several business days, so Stripe fires this same event with
  // payment_status "unpaid" first, then a separate async event once the
  // bank transfer actually clears (or fails).
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      await markPaid(session);
    }
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    await markPaid(event.data.object as Stripe.Checkout.Session);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    // The bank transfer failed to clear -- back to PENDING so the coach
    // can see it needs attention and try paying again.
    await revertToPending(event.data.object as Stripe.Checkout.Session);
  }

  // An admin's Connect onboarding progressed (or a capability changed) --
  // refresh the cached charges/payouts-enabled flags on their user row.
  if (event.type === "account.updated") {
    await persistAccountStatus(event.data.object as Stripe.Account);
  }

  // A refund was issued directly in the Stripe dashboard (refunds issued
  // from our own admin UI are already recorded). Catch the DB up so the
  // registration reflects it.
  if (event.type === "charge.refunded") {
    await reconcileDashboardRefund(event.data.object as Stripe.Charge);
  }

  return NextResponse.json({ received: true });
}

async function reconcileDashboardRefund(charge: Stripe.Charge) {
  const piId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!piId) return;

  const pi = await stripe.paymentIntents.retrieve(piId);
  const { registrationId, orderGroupId, installmentId } = pi.metadata ?? {};

  // Resolve the registration id.
  let regId = registrationId as string | undefined;
  if (!regId && installmentId) {
    const inst = await prisma.paymentInstallment.findUnique({
      where: { id: installmentId },
      select: { registrationId: true },
    });
    regId = inst?.registrationId;
  }
  if (!regId && orderGroupId) {
    // Cart order: only act on a full refund of the whole charge.
    if (charge.refunded) {
      await prisma.registration.updateMany({
        where: { orderGroupId, status: "PAID" },
        data: { status: "REFUNDED", fullyRefundedAt: new Date() },
      });
    }
    return;
  }
  if (!regId) return;

  const registration = await prisma.registration.findUnique({
    where: { id: regId },
    include: { refunds: true, installments: { select: { id: true } } },
  });
  if (!registration || registration.fullyRefundedAt) return;

  // charge.refunds isn't expanded on webhook payloads in recent API
  // versions -- list them explicitly.
  const refundList = charge.refunds?.data ?? (await stripe.refunds.list({ charge: charge.id, limit: 100 })).data;

  // What our own Refund rows already account for against this charge's
  // Stripe refund ids.
  const chargeRefundIds = new Set(refundList.map((r) => r.id));
  const recordedForCharge = registration.refunds
    .filter((r) => r.stripeRefundIds.some((id) => chargeRefundIds.has(id)))
    .reduce((sum, r) => sum + r.amountCents, 0);

  const unaccounted = charge.amount_refunded - recordedForCharge;
  if (unaccounted <= 0) return; // already in sync

  const newTotal = registration.refundedAmountCents + unaccounted;
  // Safe to call it fully refunded only for a single-charge (non-plan)
  // registration whose one charge Stripe reports as fully refunded.
  const fully = charge.refunded && registration.installments.length === 0;

  await prisma.$transaction(async (tx) => {
    await tx.registration.update({
      where: { id: regId! },
      data: {
        refundedAmountCents: newTotal,
        ...(fully ? { status: "REFUNDED" as const, fullyRefundedAt: new Date() } : {}),
      },
    });
    await tx.refund.create({
      data: {
        registrationId: regId!,
        amountCents: unaccounted,
        isFull: fully,
        source: "stripe_dashboard",
        note: "Reconciled from a refund issued in the Stripe dashboard.",
        stripeRefundIds: [...chargeRefundIds],
      },
    });
  });
}
