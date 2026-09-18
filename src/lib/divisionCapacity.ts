import { prisma } from "@/lib/db";

export type DivisionCapacityCheck =
  | { ok: true; waitlist: boolean }
  | { ok: false; httpStatus: number; error: string };

/**
 * Decides whether a new registration into `divisionId` should proceed
 * normally, go to that division's waitlist, or be blocked outright --
 * mirrors the tournament-wide teamCap check every checkout route already
 * does, but scoped to the division.
 *
 * `additionalClaimed` lets a caller processing several items in one
 * request (see checkout/cart/route.ts) account for seats already spoken
 * for by earlier items in the same submission before this one's count
 * query ran -- without it, two teams for the same division in one cart
 * could both see the same "1 spot left" snapshot.
 *
 * Same check-then-create race as the pre-existing tournament-level cap
 * check (two simultaneous requests for the last spot could both pass) --
 * not solved here, since it isn't solved there either.
 */
export async function checkDivisionCapacity(
  tournamentId: string,
  divisionId: string,
  additionalClaimed = 0
): Promise<DivisionCapacityCheck> {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    select: { id: true, tournamentId: true, teamCap: true, waitlistEnabled: true },
  });

  if (!division) {
    return { ok: false, httpStatus: 404, error: "Division not found." };
  }
  if (division.tournamentId !== tournamentId) {
    return { ok: false, httpStatus: 400, error: "That division doesn't belong to this event." };
  }
  if (division.teamCap === null) {
    return { ok: true, waitlist: false };
  }

  const registeredCount = await prisma.registration.count({
    where: { divisionId, status: { in: ["PAID", "PENDING"] } },
  });

  if (registeredCount + additionalClaimed < division.teamCap) {
    return { ok: true, waitlist: false };
  }

  if (division.waitlistEnabled) {
    return { ok: true, waitlist: true };
  }

  return { ok: false, httpStatus: 409, error: "This division is full." };
}
