import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { resolveDiscount } from "@/lib/pricing";

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

  const registeredCount = await prisma.registration.count({
    where: { tournamentId, status: { in: ["PAID", "PENDING"] } },
  });
  if (registeredCount >= tournament.teamCap) {
    return NextResponse.json({ error: "This tournament is full" }, { status: 409 });
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
  const stripeCustomerId = await getOrCreateStripeCustomer({
    userId: authSession.user.id,
    existingCustomerId: user.stripeCustomerId,
    email: user.email,
    name: user.name,
  });

  const discount = await resolveDiscount({
    entryFeeCents: tournament.entryFeeCents,
    codeInput: discountCode,
    tournamentId,
    coachEmail,
  });
  if (discount.error) {
    return NextResponse.json({ error: discount.error }, { status: 400 });
  }
  const totalCents = Math.max(0, tournament.entryFeeCents - discount.discountCents);

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
    payment_intent_data: { setup_future_usage: "off_session" },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: firstInstallment.amountCents,
          product_data: {
            name: `${tournament.name} — ${teamName} (installment 1 of ${installmentCount})`,
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
