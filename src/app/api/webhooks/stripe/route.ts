import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { recordDiscountCodeUse, markInstallmentPaid } from "@/lib/pricing";

// A checkout session is either a single registration (metadata.registrationId),
// a cart of several registered together (metadata.orderGroupId), or the
// first installment of a payment plan (metadata.installmentId). Marks
// whichever one it refers to PAID and records discount code use.
async function markPaid(session: Stripe.Checkout.Session) {
  const { registrationId, orderGroupId, installmentId } = session.metadata ?? {};

  if (installmentId) {
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

  return NextResponse.json({ received: true });
}
