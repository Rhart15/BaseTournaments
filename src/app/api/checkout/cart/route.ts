import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { resolveDiscount, recordDiscountCodeUse } from "@/lib/pricing";

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        tournamentId: z.string(),
        divisionId: z.string(),
        teamName: z.string().min(2),
      })
    )
    .min(1),
  coachName: z.string().min(2),
  coachEmail: z.string().email(),
  coachPhone: z.string().min(7),
  discountCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = cartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid cart details", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { items, coachName, coachEmail, coachPhone, discountCode } = parsed.data;

  // Look up every tournament involved up front, and enforce each one's
  // team cap the same way the single-item checkout does.
  const tournamentIds = [...new Set(items.map((i) => i.tournamentId))];
  const tournaments = await prisma.tournament.findMany({
    where: { id: { in: tournamentIds } },
  });
  const tournamentById = new Map(tournaments.map((t) => [t.id, t]));

  for (const item of items) {
    const tournament = tournamentById.get(item.tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: "One of the events in your cart no longer exists." },
        { status: 404 }
      );
    }
    const registeredCount = await prisma.registration.count({
      where: { tournamentId: item.tournamentId, status: { in: ["PAID", "PENDING"] } },
    });
    if (registeredCount >= tournament.teamCap) {
      return NextResponse.json(
        { error: `${tournament.name} is full -- remove it from your cart to continue.` },
        { status: 409 }
      );
    }
  }

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
      stripeCustomerId = await getOrCreateStripeCustomer({
        userId: authSession.user.id,
        existingCustomerId: user.stripeCustomerId,
        email: user.email,
        name: user.name,
      });
    }
  }

  const orderGroupId = randomUUID();
  const lineItems: {
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string };
    };
    quantity: number;
  }[] = [];
  const registrationIds: string[] = [];
  let discountCodeIdUsed: string | null = null;

  for (const item of items) {
    const tournament = tournamentById.get(item.tournamentId)!;
    const discount = await resolveDiscount({
      entryFeeCents: tournament.entryFeeCents,
      codeInput: discountCode,
      tournamentId: item.tournamentId,
      coachEmail,
    });
    if (discount.error) {
      return NextResponse.json({ error: discount.error }, { status: 400 });
    }
    if (discount.discountCodeId) discountCodeIdUsed = discount.discountCodeId;
    const chargeCents = Math.max(0, tournament.entryFeeCents - discount.discountCents);

    const registration = await prisma.registration.create({
      data: {
        tournamentId: item.tournamentId,
        divisionId: item.divisionId,
        teamName: item.teamName,
        coachName,
        coachEmail,
        coachPhone,
        status: "PENDING",
        teamId: ownTeamId,
        discountCodeId: discount.discountCodeId,
        discountAmountCents: discount.discountCents,
        orderGroupId,
      },
    });
    registrationIds.push(registration.id);

    if (chargeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: chargeCents,
          product_data: {
            name: `${tournament.name} — ${item.teamName} entry fee`,
          },
        },
        quantity: 1,
      });
    }
  }

  // Every item in the cart was fully covered by a discount code -- confirm
  // the whole order directly, same as a free single-item registration.
  if (lineItems.length === 0) {
    await prisma.registration.updateMany({
      where: { orderGroupId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await recordDiscountCodeUse(discountCodeIdUsed);
    return NextResponse.json({ free: true, orderGroupId });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : { customer_email: coachEmail }),
    payment_intent_data: { setup_future_usage: "off_session" },
    line_items: lineItems,
    metadata: { orderGroupId },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/register/success?order=${orderGroupId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
  });

  await prisma.registration.updateMany({
    where: { orderGroupId },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
