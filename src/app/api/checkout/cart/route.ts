import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { resolveTournamentPayout, PLATFORM_FEE_CENTS } from "@/lib/connect";
import {
  resolveDiscount,
  recordDiscountCodeUse,
  computeSalesTaxCents,
  computeProcessingFeeCents,
} from "@/lib/pricing";
import { checkDivisionCapacity } from "@/lib/divisionCapacity";

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

  // Per-item division-capacity outcome, aligned by index with `items` --
  // consumed in the creation loop below. `claimedByDivision` tracks seats
  // already spoken for by an earlier item in this same cart targeting the
  // same division, so two teams for a division with one spot left don't
  // both see it as available.
  const willWaitlist: boolean[] = [];
  const claimedByDivision = new Map<string, number>();

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

    const capacity = await checkDivisionCapacity(
      item.tournamentId,
      item.divisionId,
      claimedByDivision.get(item.divisionId) ?? 0
    );
    if (!capacity.ok) {
      return NextResponse.json({ error: capacity.error }, { status: capacity.httpStatus });
    }
    willWaitlist.push(capacity.waitlist);
    if (!capacity.waitlist) {
      claimedByDivision.set(item.divisionId, (claimedByDivision.get(item.divisionId) ?? 0) + 1);
    }
  }

  // A single Stripe checkout is one destination charge, so every event in
  // the cart must be run by the same organizer. Resolve the payout target
  // once and require it to be the same for all of them.
  let destination: string | null = null;
  for (const tId of tournamentIds) {
    const payout = await resolveTournamentPayout(tId);
    if (!payout.ok) {
      const name = tournamentById.get(tId)?.name ?? "An event in your cart";
      return NextResponse.json({ error: `${name}: ${payout.reason}` }, { status: 409 });
    }
    if (destination && destination !== payout.destination) {
      return NextResponse.json(
        {
          error:
            "Your cart has events run by different organizers. Please check out one organizer's events at a time.",
        },
        { status: 409 }
      );
    }
    destination = payout.destination;
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
  let totalChargeCents = 0;
  // Counts teams actually being charged (entry fee > 0) -- separate from
  // lineItems.length, since a tax line item added per team below would
  // otherwise inflate the per-team platform fee calculation.
  let chargedTeamCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const tournament = tournamentById.get(item.tournamentId)!;

    // Waitlisted -- park it with no charge and no discount-code
    // consumption, same reasoning as the single-item checkout routes.
    if (willWaitlist[i]) {
      const registration = await prisma.registration.create({
        data: {
          tournamentId: item.tournamentId,
          divisionId: item.divisionId,
          teamName: item.teamName,
          coachName,
          coachEmail,
          coachPhone,
          teamId: ownTeamId,
          status: "WAITLISTED",
          waitlistedAt: new Date(),
          orderGroupId,
        },
      });
      registrationIds.push(registration.id);
      continue;
    }

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
    const taxCents = computeSalesTaxCents(chargeCents, tournament.salesTaxOverridePercent);
    const feeCents = computeProcessingFeeCents(chargeCents + taxCents, tournament.disableProcessingFee);

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
        salesTaxCents: taxCents,
        processingFeeCents: feeCents,
        orderGroupId,
      },
    });
    registrationIds.push(registration.id);

    if (chargeCents > 0) {
      totalChargeCents += chargeCents;
      chargedTeamCount += 1;
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
      if (taxCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: taxCents,
            product_data: {
              name: `${tournament.name} — ${item.teamName} sales tax`,
            },
          },
          quantity: 1,
        });
      }
      if (feeCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: feeCents,
            product_data: {
              name: `${tournament.name} — ${item.teamName} processing fee`,
            },
          },
          quantity: 1,
        });
      }
    }
  }

  // Every non-waitlisted item in the cart was fully covered by a discount
  // code -- confirm those directly, same as a free single-item
  // registration. Scoped to PENDING so a WAITLISTED item created above in
  // the same order group isn't swept up and marked paid.
  if (lineItems.length === 0) {
    await prisma.registration.updateMany({
      where: { orderGroupId, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    await recordDiscountCodeUse(discountCodeIdUsed);
    return NextResponse.json({ free: true, orderGroupId });
  }

  // One flat platform fee per team actually being charged, capped so it
  // can never exceed the entry-fee total. Based on chargedTeamCount, not
  // lineItems.length -- a tax line item per team would otherwise inflate
  // this. Sales tax itself is the organizer's to remit, not BASE's, so it
  // plays no part in the platform fee either way.
  const applicationFeeCents = Math.min(
    PLATFORM_FEE_CENTS * chargedTeamCount,
    totalChargeCents
  );

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : { customer_email: coachEmail }),
    payment_intent_data: {
      setup_future_usage: "off_session",
      transfer_data: { destination: destination! },
      on_behalf_of: destination!,
      application_fee_amount: applicationFeeCents,
      metadata: { orderGroupId },
    },
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
