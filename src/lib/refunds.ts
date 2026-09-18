import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { PLATFORM_FEE_CENTS } from "@/lib/connect";

// Refunding a team's registration, handling destination charges correctly.
//
// Money model (see /lib/connect.ts): a paid registration is a destination
// charge on the PLATFORM account -- the tournament owner's connected
// account received (entry fee - $15) via an automatic transfer, and the
// $15 stayed with the platform as an application fee. A payment-plan
// registration is several such charges, with the $15 taken once on the
// first installment.
//
// Policy (confirmed with the owner):
//   * FULL refund  -> customer made 100% whole, including the $15. We
//     reverse the transfer AND refund the application fee, so the
//     connected account bears its share and the platform gives back its
//     fee. If the connected account was already paid out and has no
//     balance, Stripe drives it negative and recovers from future
//     volume (ultimately the platform's liability -- surfaced in the UI).
//   * PARTIAL refund -> the $15 is non-refundable. We refund the entered
//     amount to the customer and explicitly reverse that same amount
//     from the connected account (capped at what it still holds for this
//     charge); the platform absorbs any shortfall. Plan registrations
//     cannot be partially refunded.
//   * Comped / $0 registrations -> no Stripe call, just cancelled.
//   * Legacy charges with no transfer -> plain refund, nothing to reverse.

export type RefundInput = {
  registrationId: string;
  /** null / omitted = full refund of whatever is left. */
  amountCents?: number | null;
  reason?: string | null;
  actorUserId: string;
};

export type RefundResult = {
  ok: boolean;
  error?: string;
  refundRowId?: string;
  customerRefundedCents: number;
  transferReversedCents: number;
  platformAbsorbedCents: number;
  platformFeeRefundedCents: number;
  fullyRefunded: boolean;
  note?: string;
};

type ChargeRef = {
  chargeId: string;
  grossCents: number;
  alreadyRefundedCents: number;
  transferId: string | null;
  /** transfer amount still not reversed (0 when no transfer). */
  transferRemainingCents: number;
  hasApplicationFee: boolean;
  pending: boolean;
};

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

async function toChargeRef(charge: Stripe.Charge): Promise<ChargeRef> {
  const transferId = idOf(charge.transfer as string | { id: string } | null);
  let transferRemainingCents = 0;
  if (transferId) {
    try {
      const transfer = await stripe.transfers.retrieve(transferId);
      transferRemainingCents = Math.max(0, transfer.amount - transfer.amount_reversed);
    } catch {
      // If we can't read it, assume the full net is still there so a
      // reversal attempt is at least made; Stripe caps it for us.
      transferRemainingCents = Math.max(0, charge.amount - PLATFORM_FEE_CENTS);
    }
  }
  return {
    chargeId: charge.id,
    grossCents: charge.amount,
    alreadyRefundedCents: charge.amount_refunded,
    transferId,
    transferRemainingCents,
    hasApplicationFee: Boolean(charge.application_fee),
    pending: charge.status === "pending",
  };
}

async function chargeFromPaymentIntent(piId: string): Promise<Stripe.Charge | null> {
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ["latest_charge"],
  });
  const charge = pi.latest_charge as Stripe.Charge | null;
  return charge && typeof charge === "object" ? charge : null;
}

/** Every Stripe charge that backs this registration. */
async function collectCharges(
  registration: { stripeSessionId: string | null },
  paidInstallments: { stripePaymentIntentId: string | null }[]
): Promise<{ charges: ChargeRef[]; problems: string[] }> {
  const problems: string[] = [];
  const charges: ChargeRef[] = [];

  if (paidInstallments.length > 0) {
    for (const inst of paidInstallments) {
      if (!inst.stripePaymentIntentId) {
        problems.push("A paid installment has no recorded Stripe payment — refund it from the Stripe dashboard.");
        continue;
      }
      const charge = await chargeFromPaymentIntent(inst.stripePaymentIntentId);
      if (!charge) {
        problems.push("Couldn't load a Stripe charge for one installment.");
        continue;
      }
      charges.push(await toChargeRef(charge));
    }
    return { charges, problems };
  }

  if (!registration.stripeSessionId) {
    problems.push("This registration has no Stripe checkout on file.");
    return { charges, problems };
  }
  const session = await stripe.checkout.sessions.retrieve(registration.stripeSessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge"],
  });
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = (pi?.latest_charge ?? null) as Stripe.Charge | null;
  if (!charge || typeof charge !== "object") {
    problems.push("No completed Stripe charge found for this registration.");
    return { charges, problems };
  }
  charges.push(await toChargeRef(charge));
  return { charges, problems };
}

/**
 * What was actually charged for this registration, per our own records.
 * The installment branch doesn't need separate tax/fee terms -- any sales
 * tax and processing fee were baked into the installment split before the
 * total was divided (see /api/checkout/plan), so each PAID/REFUNDED
 * installment's amountCents already reflects its share of both.
 */
export function chargedCentsFor(reg: {
  isVipComp: boolean;
  discountAmountCents: number;
  salesTaxCents: number;
  processingFeeCents: number;
  tournament: { entryFeeCents: number };
  installments: { status: string; amountCents: number }[];
}): number {
  if (reg.installments.length > 0) {
    return reg.installments
      .filter((i) => i.status === "PAID" || i.status === "REFUNDED")
      .reduce((sum, i) => sum + i.amountCents, 0);
  }
  return Math.max(
    0,
    reg.tournament.entryFeeCents - reg.discountAmountCents + reg.salesTaxCents + reg.processingFeeCents
  );
}

const EMPTY = {
  customerRefundedCents: 0,
  transferReversedCents: 0,
  platformAbsorbedCents: 0,
  platformFeeRefundedCents: 0,
};

export type RefundPreview = {
  registrationId: string;
  teamName: string;
  divisionLabel: string;
  status: string;
  isPlan: boolean;
  isComp: boolean;
  sharedCharge: boolean;
  chargedCents: number;
  alreadyRefundedCents: number;
  refundableCents: number;
  ownerName: string | null;
  ownerOnboarded: boolean;
  ownerBalanceCents: number | null;
  inBracket: boolean;
  priorRefunds: {
    amountCents: number;
    isFull: boolean;
    reason: string | null;
    note: string | null;
    source: string;
    createdAt: string;
  }[];
};

export async function refundPreview(registrationId: string): Promise<RefundPreview | null> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      tournament: { select: { entryFeeCents: true, owner: { select: { name: true, stripeConnectAccountId: true, stripeConnectChargesEnabled: true } } } },
      division: { select: { label: true } },
      installments: true,
      refunds: { orderBy: { createdAt: "asc" } },
      homeGames: { select: { id: true } },
      awayGames: { select: { id: true } },
    },
  });
  if (!reg) return null;

  const siblingCount = reg.orderGroupId
    ? await prisma.registration.count({ where: { orderGroupId: reg.orderGroupId } })
    : 1;

  const chargedCents = chargedCentsFor(reg);
  const isComp = reg.isVipComp || chargedCents === 0;
  const alreadyRefundedCents = reg.refundedAmountCents;

  let ownerBalanceCents: number | null = null;
  const acct = reg.tournament.owner?.stripeConnectAccountId;
  if (acct) {
    try {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: acct });
      ownerBalanceCents = balance.available.reduce((s, b) => s + b.amount, 0);
    } catch {
      ownerBalanceCents = null;
    }
  }

  return {
    registrationId,
    teamName: reg.teamName,
    divisionLabel: reg.division.label,
    status: reg.status,
    isPlan: reg.installments.length > 0,
    isComp,
    sharedCharge: reg.installments.length === 0 && siblingCount > 1,
    chargedCents,
    alreadyRefundedCents,
    refundableCents: Math.max(0, chargedCents - alreadyRefundedCents),
    ownerName: reg.tournament.owner?.name ?? null,
    ownerOnboarded: Boolean(reg.tournament.owner?.stripeConnectChargesEnabled),
    ownerBalanceCents,
    inBracket:
      reg.homeGames.length > 0 ||
      reg.awayGames.length > 0 ||
      reg.poolId !== null ||
      reg.seed !== null,
    priorRefunds: reg.refunds.map((r) => ({
      amountCents: r.amountCents,
      isFull: r.isFull,
      reason: r.reason,
      note: r.note,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function refundRegistration(input: RefundInput): Promise<RefundResult> {
  const { registrationId, actorUserId } = input;
  const reason = input.reason?.trim() || null;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { tournament: { select: { entryFeeCents: true } }, installments: true },
  });
  // Cart orders put several registrations on one Stripe charge, so a
  // refund for one of them can only ever be a partial refund of that
  // shared charge (with the $15 fee kept), never a whole-charge refund.
  const siblingCount = registration?.orderGroupId
    ? await prisma.registration.count({ where: { orderGroupId: registration.orderGroupId } })
    : 1;
  if (!registration) {
    return { ok: false, error: "Registration not found.", fullyRefunded: false, ...EMPTY };
  }
  if (registration.fullyRefundedAt || registration.status === "REFUNDED") {
    return { ok: false, error: "This registration has already been fully refunded.", fullyRefunded: true, ...EMPTY };
  }
  if (registration.status === "CANCELLED") {
    return { ok: false, error: "This registration is cancelled.", fullyRefunded: false, ...EMPTY };
  }
  if (registration.status !== "PAID") {
    return { ok: false, error: "Only a paid registration can be refunded.", fullyRefunded: false, ...EMPTY };
  }

  const isPlan = registration.installments.length > 0;
  const chargedCents = chargedCentsFor(registration);
  const alreadyRefunded = registration.refundedAmountCents;
  const remaining = chargedCents - alreadyRefunded;
  const isComp = registration.isVipComp || chargedCents === 0;

  // --- Comped / free registration: cancel, no money to move ----------
  if (isComp) {
    const row = await prisma.$transaction(async (tx) => {
      await tx.registration.update({
        where: { id: registrationId },
        data: { status: "CANCELLED", fullyRefundedAt: new Date() },
      });
      return tx.refund.create({
        data: {
          registrationId,
          amountCents: 0,
          isFull: true,
          reason,
          note: registration.isVipComp
            ? "Comped registration — cancelled, no payment to refund."
            : "Fully discounted registration — cancelled, no payment to refund.",
          createdByUserId: actorUserId,
          stripeRefundIds: [],
        },
      });
    });
    return { ok: true, refundRowId: row.id, fullyRefunded: true, note: row.note ?? undefined, ...EMPTY };
  }

  if (remaining <= 0) {
    return { ok: false, error: "Nothing left to refund on this registration.", fullyRefunded: false, ...EMPTY };
  }

  const wantFull = input.amountCents == null;
  const refundTarget = wantFull ? remaining : Math.round(input.amountCents as number);
  if (!wantFull) {
    if (refundTarget <= 0) {
      return { ok: false, error: "Refund amount must be greater than zero.", fullyRefunded: false, ...EMPTY };
    }
    if (refundTarget > remaining) {
      return {
        ok: false,
        error: `That's more than the ${(remaining / 100).toFixed(2)} still refundable on this registration.`,
        fullyRefunded: false,
        ...EMPTY,
      };
    }
  }
  const isFull = refundTarget >= remaining;
  // A cart order shares one charge across several registrations, so even a
  // "full" refund of one of them is a partial refund of that charge and
  // the $15 fee is kept.
  const sharedCharge = !isPlan && siblingCount > 1;

  if (isPlan && !isFull) {
    return {
      ok: false,
      error: "Payment-plan registrations can only be fully refunded, not partially.",
      fullyRefunded: false,
      ...EMPTY,
    };
  }

  const paidInstallments = registration.installments.filter((i) => i.status === "PAID");
  const { charges, problems } = await collectCharges(registration, isPlan ? paidInstallments : []);

  const usableCharges = charges.filter((c) => !c.pending && c.alreadyRefundedCents < c.grossCents);
  if (charges.some((c) => c.pending)) {
    problems.push("A charge is still settling (ACH) and can't be refunded yet — try again once it clears.");
  }
  if (usableCharges.length === 0) {
    return {
      ok: false,
      error: problems[0] ?? "No refundable Stripe charge found for this registration.",
      note: problems.join(" "),
      fullyRefunded: false,
      ...EMPTY,
    };
  }

  const metadata = {
    registrationId,
    tournamentId: registration.tournamentId,
    actorUserId,
    ...(reason ? { reason: reason.slice(0, 480) } : {}),
  };

  let customerRefundedCents = 0;
  let transferReversedCents = 0;
  let platformFeeRefundedCents = 0;
  const stripeRefundIds: string[] = [];

  try {
    if (isFull && !sharedCharge) {
      // Full refund of every backing charge.
      for (const c of usableCharges) {
        const chargeRemaining = c.grossCents - c.alreadyRefundedCents;
        const refund = await stripe.refunds.create(
          {
            charge: c.chargeId,
            reason: "requested_by_customer",
            ...(c.transferId ? { reverse_transfer: true } : {}),
            ...(c.hasApplicationFee ? { refund_application_fee: true } : {}),
            metadata,
          },
          { idempotencyKey: `refund-full-${registrationId}-${c.chargeId}` }
        );
        stripeRefundIds.push(refund.id);
        customerRefundedCents += refund.amount;
        if (c.transferId) {
          transferReversedCents += Math.min(refund.amount, c.transferRemainingCents);
        }
        if (c.hasApplicationFee) {
          platformFeeRefundedCents += Math.min(PLATFORM_FEE_CENTS, chargeRemaining);
        }
      }
    } else {
      // Partial refund of a single (non-plan) charge -- also the path for
      // any cart-order registration. $15 platform fee is kept.
      const c = usableCharges[0];
      const refund = await stripe.refunds.create(
        {
          charge: c.chargeId,
          amount: refundTarget,
          reason: "requested_by_customer",
          metadata,
        },
        { idempotencyKey: `refund-part-${registrationId}-${c.chargeId}-${alreadyRefunded}-${refundTarget}` }
      );
      stripeRefundIds.push(refund.id);
      customerRefundedCents += refund.amount;

      if (c.transferId && c.transferRemainingCents > 0) {
        const reverseAmount = Math.min(refund.amount, c.transferRemainingCents);
        if (reverseAmount > 0) {
          await stripe.transfers.createReversal(
            c.transferId,
            { amount: reverseAmount, metadata },
            { idempotencyKey: `reversal-${registrationId}-${c.chargeId}-${alreadyRefunded}-${refundTarget}` }
          );
          transferReversedCents += reverseAmount;
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe refund failed.";
    if (stripeRefundIds.length === 0) {
      return { ok: false, error: message, note: problems.join(" ") || undefined, fullyRefunded: false, ...EMPTY };
    }
    // Some money already moved -- fall through and record what succeeded.
    problems.push(`Refund stopped partway: ${message}`);
  }

  const platformAbsorbedCents = Math.max(
    0,
    customerRefundedCents - transferReversedCents - platformFeeRefundedCents
  );
  const newRefundedTotal = alreadyRefunded + customerRefundedCents;
  const fullyRefunded = newRefundedTotal >= chargedCents && problems.length === 0;

  const row = await prisma.$transaction(async (tx) => {
    await tx.registration.update({
      where: { id: registrationId },
      data: {
        refundedAmountCents: newRefundedTotal,
        ...(fullyRefunded
          ? { status: "REFUNDED" as const, fullyRefundedAt: new Date() }
          : {}),
      },
    });

    if (isPlan && fullyRefunded) {
      await tx.paymentInstallment.updateMany({
        where: { registrationId, status: "PAID" },
        data: { status: "REFUNDED" },
      });
      await tx.paymentInstallment.updateMany({
        where: { registrationId, status: { in: ["PENDING", "FAILED"] } },
        data: { status: "CANCELLED" },
      });
    }

    return tx.refund.create({
      data: {
        registrationId,
        amountCents: customerRefundedCents,
        transferReversedCents,
        platformAbsorbedCents,
        platformFeeRefundedCents,
        isFull: fullyRefunded,
        reason,
        stripeRefundIds,
        note: problems.length > 0 ? problems.join(" ") : null,
        createdByUserId: actorUserId,
      },
    });
  });

  return {
    ok: true,
    refundRowId: row.id,
    customerRefundedCents,
    transferReversedCents,
    platformAbsorbedCents,
    platformFeeRefundedCents,
    fullyRefunded,
    note: problems.length > 0 ? problems.join(" ") : undefined,
  };
}
