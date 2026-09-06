import { prisma } from "@/lib/db";

// Multi-team discount: registering a 2nd+ team from the same coach email
// into the SAME tournament automatically knocks a flat percentage off.
// This is a simple, non-configurable policy for now -- if BASE wants this
// tunable per-tournament later, it belongs on the Tournament model.
const MULTI_TEAM_DISCOUNT_PERCENT = 10;

export type DiscountResult = {
  discountCents: number;
  discountCodeId: string | null;
  error?: string;
};

// Resolves however much a registration's entry fee should be reduced by,
// combining an optional entered discount code with the automatic
// multi-team discount. The two stack (added together), but the combined
// discount is always capped so the charge never goes below $0.
export async function resolveDiscount({
  entryFeeCents,
  codeInput,
  tournamentId,
  coachEmail,
}: {
  entryFeeCents: number;
  codeInput?: string | null;
  tournamentId: string;
  coachEmail: string;
}): Promise<DiscountResult> {
  let codeDiscountCents = 0;
  let discountCodeId: string | null = null;

  if (codeInput && codeInput.trim()) {
    const code = await prisma.discountCode.findFirst({
      where: { code: { equals: codeInput.trim(), mode: "insensitive" } },
    });

    if (!code || !code.active) {
      return { discountCents: 0, discountCodeId: null, error: "That discount code isn't valid." };
    }
    if (code.expiresAt && code.expiresAt < new Date()) {
      return { discountCents: 0, discountCodeId: null, error: "That discount code has expired." };
    }
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      return { discountCents: 0, discountCodeId: null, error: "That discount code has already been fully used." };
    }

    codeDiscountCents =
      code.type === "PERCENT"
        ? Math.round((entryFeeCents * code.value) / 100)
        : code.value;
    discountCodeId = code.id;
  }

  const priorTeamsThisTournament = await prisma.registration.count({
    where: {
      tournamentId,
      coachEmail: { equals: coachEmail, mode: "insensitive" },
      status: { in: ["PAID", "PENDING"] },
    },
  });
  const multiTeamDiscountCents =
    priorTeamsThisTournament >= 1
      ? Math.round((entryFeeCents * MULTI_TEAM_DISCOUNT_PERCENT) / 100)
      : 0;

  const discountCents = Math.min(
    entryFeeCents,
    codeDiscountCents + multiTeamDiscountCents
  );

  return { discountCents, discountCodeId };
}

// Called from the Stripe webhook once a registration is confirmed paid, so
// a code's usedCount only increments on an actual successful payment (not
// on every abandoned checkout attempt).
export async function recordDiscountCodeUse(discountCodeId: string | null) {
  if (!discountCodeId) return;
  await prisma.discountCode.update({
    where: { id: discountCodeId },
    data: { usedCount: { increment: 1 } },
  });
}
