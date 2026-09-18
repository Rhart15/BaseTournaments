import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { resolveTournamentPayout, feeFor } from "@/lib/connect";
import {
  resolveDiscount,
  recordDiscountCodeUse,
  computeSalesTaxCents,
  computeProcessingFeeCents,
} from "@/lib/pricing";
import { checkDivisionCapacity } from "@/lib/divisionCapacity";

const registerSchema = z.object({
  tournamentId: z.string(),
  divisionId: z.string(),
  teamName: z.string().min(2),
  coachName: z.string().min(2),
  coachEmail: z.string().email(),
  coachPhone: z.string().min(7),
  discountCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration details", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { tournamentId, divisionId, teamName, coachName, coachEmail, coachPhone, discountCode } =
    parsed.data;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // The tournament can only take registrations once its organizer has an
  // onboarded Stripe Connect account to route the payment to.
  const payout = await resolveTournamentPayout(tournamentId);
  if (!payout.ok) {
    return NextResponse.json({ error: payout.reason }, { status: 409 });
  }

  // Enforce the team cap before taking payment.
  const registeredCount = await prisma.registration.count({
    where: { tournamentId, status: { in: ["PAID", "PENDING"] } },
  });
  if (registeredCount >= tournament.teamCap) {
    return NextResponse.json(
      { error: "This tournament is full" },
      { status: 409 }
    );
  }

  const capacity = await checkDivisionCapacity(tournamentId, divisionId);
  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.error }, { status: capacity.httpStatus });
  }

  // If a logged-in coach with their own Team account is registering,
  // link this purchase to that Team -- this is what makes it show up
  // automatically on their Team profile's tournament history once
  // paid, with no extra admin step. Derived from the server-side
  // session only, never trusted from client input, so a purchase can't
  // be attributed to a team the buyer doesn't own.
  const authSession = await auth();
  let ownTeamId: string | null = null;
  if (authSession?.user?.id) {
    const ownTeam = await prisma.team.findFirst({
      where: { coachUserId: authSession.user.id },
      select: { id: true },
    });
    ownTeamId = ownTeam?.id ?? null;
  }

  // The division is full but has a waitlist -- park the registration there
  // with no charge and no discount-code consumption (that's re-evaluated
  // when an admin invites them in), rather than touching Stripe at all.
  if (capacity.waitlist) {
    const registration = await prisma.registration.create({
      data: {
        tournamentId,
        divisionId,
        teamName,
        coachName,
        coachEmail,
        coachPhone,
        teamId: ownTeamId,
        status: "WAITLISTED",
        waitlistedAt: new Date(),
      },
    });
    return NextResponse.json({ registrationId: registration.id, waitlisted: true });
  }

  let stripeCustomerId: string | undefined;
  if (authSession?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    });
    if (user) {
      // If Stripe is unreachable or misconfigured (e.g. placeholder keys
      // during setup), don't let that crash checkout for a logged-in
      // coach -- just proceed without a saved customer, same as a guest.
      try {
        stripeCustomerId = await getOrCreateStripeCustomer({
          userId: authSession.user.id,
          existingCustomerId: user.stripeCustomerId,
          email: user.email,
          name: user.name,
        });
      } catch (err) {
        console.error("Couldn't create/fetch Stripe customer, proceeding without one:", err);
      }
    }
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
  const chargeCents = tournament.entryFeeCents - discount.discountCents;
  // Tax applies to the post-discount amount actually being paid, using
  // this event's own flat rate (there's no platform default to fall back
  // to). Kept separate from chargeCents -- the platform's flat fee below
  // is computed from the entry fee alone, unaffected by tax.
  const taxCents = computeSalesTaxCents(chargeCents, tournament.salesTaxOverridePercent);
  // Processing fee is computed on the tax-inclusive charge and, like tax,
  // is transferred to the organizer rather than kept by the platform --
  // see computeProcessingFeeCents in /lib/pricing.ts.
  const feeCents = computeProcessingFeeCents(chargeCents + taxCents, tournament.disableProcessingFee);

  // A discount code big enough to fully cover the entry fee has nothing
  // left for Stripe to charge -- confirm it directly instead, the same
  // way a VIP-comped registration is confirmed with no checkout session.
  // (chargeCents <= 0 means taxCents/feeCents are 0 too -- nothing to tax or fee.)
  if (chargeCents <= 0) {
    const registration = await prisma.registration.create({
      data: {
        tournamentId,
        divisionId,
        teamName,
        coachName,
        coachEmail,
        coachPhone,
        teamId: ownTeamId,
        status: "PAID",
        paidAt: new Date(),
        discountCodeId: discount.discountCodeId,
        discountAmountCents: discount.discountCents,
      },
    });
    await recordDiscountCodeUse(discount.discountCodeId);
    return NextResponse.json({ registrationId: registration.id, free: true });
  }

  const registration = await prisma.registration.create({
    data: {
      tournamentId,
      divisionId,
      teamName,
      coachName,
      coachEmail,
      coachPhone,
      status: "PENDING",
      teamId: ownTeamId,
      discountCodeId: discount.discountCodeId,
      discountAmountCents: discount.discountCents,
      salesTaxCents: taxCents,
      processingFeeCents: feeCents,
    },
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : { customer_email: coachEmail }),
    payment_intent_data: {
      setup_future_usage: "off_session",
      // Destination charge: the entry fee, sales tax (the organizer's to
      // remit, not BASE's), and processing fee (offsets the organizer's
      // real Stripe cost on this charge, see computeProcessingFeeCents)
      // all land in the tournament organizer's connected account, minus
      // the flat platform fee, which is computed from the entry fee alone
      // and stays with BASE either way.
      transfer_data: { destination: payout.destination },
      on_behalf_of: payout.destination,
      application_fee_amount: feeFor(chargeCents),
      metadata: { registrationId: registration.id },
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: chargeCents,
          product_data: {
            name:
              discount.discountCents > 0
                ? `${tournament.name} — ${teamName} entry fee (discount applied)`
                : `${tournament.name} — ${teamName} entry fee`,
          },
        },
        quantity: 1,
      },
      ...(taxCents > 0
        ? [
            {
              price_data: {
                currency: "usd",
                unit_amount: taxCents,
                product_data: { name: "Sales tax" },
              },
              quantity: 1,
            },
          ]
        : []),
      ...(feeCents > 0
        ? [
            {
              price_data: {
                currency: "usd",
                unit_amount: feeCents,
                product_data: { name: "Processing fee" },
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    metadata: {
      registrationId: registration.id,
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
