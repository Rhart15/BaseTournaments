import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { resolveTournamentPayout, feeFor } from "@/lib/connect";
import { resolveDiscount, computeSalesTaxCents, computeProcessingFeeCents } from "@/lib/pricing";
import { checkDivisionCapacity } from "@/lib/divisionCapacity";

const planSchema = z.object({
  tournamentId: z.string(),
  divisionId: z.string(),
  teamName: z.string().min(2),
  coachName: z.string().min(2),
  coachEmail: z.string().email(),
  coachPhone: z.string().min(7),
  installmentCount: z.number().int().min(2).max(4),
  discountCode: z.string().optional(),
});

// Payment plans require a saved card on file for the automatic later
// installments, which means they require a logged-in coach account --
// there's no reliable way to auto-charge someone who checked out as a
// guest. The registration form only shows this option when logged in.
export async function POST(req: NextRequest) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json(
      { error: "Log in to use a payment plan, so later installments have a saved card to charge." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration details", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const {
    tournamentId,
    divisionId,
    teamName,
    coachName,
    coachEmail,
    coachPhone,
    installmentCount,
    discountCode,
  } = parsed.data;

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const payout = await resolveTournamentPayout(tournamentId);
  if (!payout.ok) {
    return NextResponse.json({ error: payout.reason }, { status: 409 });
  }

  const registeredCount = await prisma.registration.count({
    where: { tournamentId, status: { in: ["PAID", "PENDING"] } },
  });
  if (registeredCount >= tournament.teamCap) {
    return NextResponse.json({ error: "This tournament is full" }, { status: 409 });
  }

  const capacity = await checkDivisionCapacity(tournamentId, divisionId);
  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.error }, { status: capacity.httpStatus });
  }

  // Waitlisted -- park the registration with no installments/charge at all,
  // same as the other checkout routes.
  if (capacity.waitlist) {
    const ownTeam = await prisma.team.findFirst({
      where: { coachUserId: authSession.user.id },
      select: { id: true },
    });
    const registration = await prisma.registration.create({
      data: {
        tournamentId,
        divisionId,
        teamName,
        coachName,
        coachEmail,
        coachPhone,
        teamId: ownTeam?.id ?? null,
        status: "WAITLISTED",
        waitlistedAt: new Date(),
      },
    });
    return NextResponse.json({ registrationId: registration.id, waitlisted: true });
  }

  const [ownTeam, user] = await Promise.all([
    prisma.team.findFirst({
      where: { coachUserId: authSession.user.id },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    }),
  ]);
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomer({
      userId: authSession.user.id,
      existingCustomerId: user.stripeCustomerId,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    console.error("Couldn't set up a Stripe customer for a payment plan:", err);
    return NextResponse.json(
      { error: "Couldn't set up automatic billing right now. Try Card instead, or try again shortly." },
      { status: 502 }
    );
  }

  const discount = await resolveDiscount({
    entryFeeCents: tournament.entryFeeCents,
    codeInput: discountCode,
    tournamentId,
    coachEmail,
  });
  if (discount.error) {
    return NextResponse.json({ error: discount.error }, { status: 400 });
  }
  const preTaxCents = Math.max(0, tournament.entryFeeCents - discount.discountCents);
  // Tax is spread proportionally across every installment rather than
  // itemized separately -- later installments are charged off-session by
  // the cron as a single PaymentIntent amount with no line-item concept at
  // all, so itemizing it just for installment 1's Checkout Session would
  // be inconsistent with how 2-N are actually charged.
  const taxCents = computeSalesTaxCents(preTaxCents, tournament.salesTaxOverridePercent);
  // Processing fee is baked into the total the same way tax is (see the
  // comment above taxCents) rather than itemized -- same reasoning:
  // installments 2-N have no line-item concept to itemize into anyway.
  const feeCents = computeProcessingFeeCents(preTaxCents + taxCents, tournament.disableProcessingFee);
  const totalCents = preTaxCents + taxCents + feeCents;

  // Split into equal installments, 30 days apart; the last one absorbs
  // whatever's left over from integer division so the total matches
  // exactly to the cent.
  const baseShare = Math.floor(totalCents / installmentCount);
  const amounts = Array.from({ length: installmentCount }, (_, i) =>
    i === installmentCount - 1
      ? totalCents - baseShare * (installmentCount - 1)
      : baseShare
  );

  const registration = await prisma.registration.create({
    data: {
      tournamentId,
      divisionId,
      teamName,
      coachName,
      coachEmail,
      coachPhone,
      status: "PENDING",
      teamId: ownTeam?.id ?? null,
      discountCodeId: discount.discountCodeId,
      discountAmountCents: discount.discountCents,
      salesTaxCents: taxCents,
      processingFeeCents: feeCents,
    },
  });

  const now = new Date();
  const installments = await Promise.all(
    amounts.map((amountCents, i) =>
      prisma.paymentInstallment.create({
        data: {
          registrationId: registration.id,
          amountCents,
          dueDate: new Date(now.getTime() + i * 30 * 24 * 60 * 60 * 1000),
        },
      })
    )
  );

  const firstInstallment = installments[0];

  // Nothing to charge today (a discount code covered the whole first
  // installment) -- mark it paid directly, same as the free-checkout path
  // elsewhere, and leave the rest to the scheduled job.
  if (firstInstallment.amountCents <= 0) {
    await prisma.paymentInstallment.update({
      where: { id: firstInstallment.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    return NextResponse.json({ free: true, registrationId: registration.id });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer: stripeCustomerId,
    payment_intent_data: {
      setup_future_usage: "off_session",
      // Route this installment to the organizer's connected account. The
      // whole flat platform fee is taken here on the first installment;
      // later installments (charged off-session by the cron) carry no
      // application fee -- see /lib/installments.ts. feeFor() is computed
      // from the actual (tax- and processing-fee-inclusive, since both are
      // baked into the installment split above) first-installment amount --
      // a small, deliberate simplification vs. the other routes'
      // entry-fee-only basis, since the flat $15 fee is unaffected either
      // way except in edge cases where tax/fee alone would push the
      // installment past $15.
      transfer_data: { destination: payout.destination },
      on_behalf_of: payout.destination,
      application_fee_amount: feeFor(firstInstallment.amountCents),
      metadata: {
        registrationId: registration.id,
        installmentId: firstInstallment.id,
      },
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: firstInstallment.amountCents,
          product_data: {
            name: `${tournament.name} — ${teamName} (installment 1 of ${installmentCount}${
              taxCents > 0 && feeCents > 0
                ? ", incl. tax & fee"
                : taxCents > 0
                ? ", incl. tax"
                : feeCents > 0
                ? ", incl. fee"
                : ""
            })`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      registrationId: registration.id,
      installmentId: firstInstallment.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/register/success?registration=${registration.id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tournaments/${tournamentId}`,
  });

  await prisma.registration.update({
    where: { id: registration.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
