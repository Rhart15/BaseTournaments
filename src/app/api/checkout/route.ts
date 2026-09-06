import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { resolveDiscount, recordDiscountCodeUse } from "@/lib/pricing";

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

  // If a logged-in coach with their own Team account is registering,
  // link this purchase to that Team -- this is what makes it show up
  // automatically on their Team profile's tournament history once
  // paid, with no extra admin step. Derived from the server-side
  // session only, never trusted from client input, so a purchase can't
  // be attributed to a team the buyer doesn't own.
  const authSession = await auth();
  let ownTeamId: string | null = null;
  let stripeCustomerId: string | undefined;
  if (authSession?.user?.id) {
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
    ownTeamId = ownTeam?.id ?? null;
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

  // A discount code big enough to fully cover the entry fee has nothing
  // left for Stripe to charge -- confirm it directly instead, the same
  // way a VIP-comped registration is confirmed with no checkout session.
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
