import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Admin access is a real logged-in user with role ADMIN. (The old
// shared-password cookie was removed -- every admin now has their own
// account.) Two tiers:
//   - lead admin  (isSuperAdmin): unrestricted across the whole site,
//     can manage other admins and reassign tournament ownership.
//   - regular admin: can create tournaments and manage only the ones
//     they own (Tournament.ownerId === their user id).

export type AdminSession = Session & {
  user: Session["user"] & { id: string; role: string; isSuperAdmin: boolean };
};

/** The session iff it belongs to a logged-in ADMIN, else null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session as AdminSession;
}

/** Back-compat boolean gate used by the site-wide admin routes. */
export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export function isLeadAdmin(session: AdminSession | null | undefined): boolean {
  return Boolean(session?.user?.isSuperAdmin);
}

/** The session iff it belongs to a lead admin, else null. */
export async function getLeadAdminSession(): Promise<AdminSession | null> {
  const session = await getAdminSession();
  return isLeadAdmin(session) ? session : null;
}

// --- Per-tournament ownership checks --------------------------------
// A lead admin passes every check. A regular admin passes only for the
// tournaments they own. Each helper resolves the owning tournament from
// whatever id the route has in hand.

export async function canManageTournament(
  tournamentId: string,
  session: AdminSession | null
): Promise<boolean> {
  if (!session) return false;
  if (isLeadAdmin(session)) return true;
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ownerId: true },
  });
  return Boolean(t && t.ownerId && t.ownerId === session.user.id);
}

export async function canManageDivision(
  divisionId: string,
  session: AdminSession | null
): Promise<boolean> {
  if (!session) return false;
  if (isLeadAdmin(session)) return true;
  const d = await prisma.division.findUnique({
    where: { id: divisionId },
    select: { tournament: { select: { ownerId: true } } },
  });
  return Boolean(d && d.tournament.ownerId && d.tournament.ownerId === session.user.id);
}

export async function canManageCustomButton(
  buttonId: string,
  session: AdminSession | null
): Promise<boolean> {
  if (!session) return false;
  if (isLeadAdmin(session)) return true;
  const b = await prisma.eventCustomButton.findUnique({
    where: { id: buttonId },
    select: { tournament: { select: { ownerId: true } } },
  });
  return Boolean(b && b.tournament.ownerId && b.tournament.ownerId === session.user.id);
}

export async function canManageGame(
  gameId: string,
  session: AdminSession | null
): Promise<boolean> {
  if (!session) return false;
  if (isLeadAdmin(session)) return true;
  const g = await prisma.game.findUnique({
    where: { id: gameId },
    select: { division: { select: { tournament: { select: { ownerId: true } } } } },
  });
  const ownerId = g?.division.tournament.ownerId;
  return Boolean(ownerId && ownerId === session.user.id);
}

export async function canManageRegistration(
  registrationId: string,
  session: AdminSession | null
): Promise<boolean> {
  if (!session) return false;
  if (isLeadAdmin(session)) return true;
  const r = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { tournament: { select: { ownerId: true } } },
  });
  const ownerId = r?.tournament.ownerId;
  return Boolean(ownerId && ownerId === session.user.id);
}

/** where-clause for "tournaments this admin may see/manage". */
export function tournamentScopeWhere(session: AdminSession) {
  return isLeadAdmin(session) ? {} : { ownerId: session.user.id };
}

// --- Route guards --------------------------------------------------
// Each returns either the admin session, or the status/message a route
// should reply with. Usage:
//   const g = await guardDivision(id);
//   if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
//   // g.session is available here
//
// Every guard takes an optional pre-resolved `session`. Omit it (the
// website's routes all do) and it's read from the NextAuth cookie, same
// as always. The mobile API routes pass one explicitly -- resolved from
// a bearer token via getMobileAdminSession() in src/lib/mobileAuth.ts --
// so both transports share this exact same permission logic instead of
// it being reimplemented per platform. Passing `null` (vs. leaving the
// argument out) means "no session, don't fall back to the cookie" --
// what an unauthenticated mobile request should get.

export type Guard =
  | { ok: true; session: AdminSession }
  | { ok: false; status: number; error: string };

const DENIED: Guard = {
  ok: false,
  status: 403,
  error: "You don't have access to this tournament.",
};
const UNAUTH: Guard = { ok: false, status: 401, error: "Unauthorized" };

async function resolveSession(
  session: AdminSession | null | undefined
): Promise<AdminSession | null> {
  return session === undefined ? await getAdminSession() : session;
}

export async function guardAdmin(session?: AdminSession | null): Promise<Guard> {
  const s = await resolveSession(session);
  return s ? { ok: true, session: s } : UNAUTH;
}

export async function guardLeadAdmin(session?: AdminSession | null): Promise<Guard> {
  const s = await resolveSession(session);
  if (!s) return UNAUTH;
  if (!isLeadAdmin(s)) {
    return { ok: false, status: 403, error: "Only a lead admin can do this." };
  }
  return { ok: true, session: s };
}

export async function guardTournament(
  tournamentId: string,
  session?: AdminSession | null
): Promise<Guard> {
  const s = await resolveSession(session);
  if (!s) return UNAUTH;
  return (await canManageTournament(tournamentId, s)) ? { ok: true, session: s } : DENIED;
}

export async function guardDivision(
  divisionId: string,
  session?: AdminSession | null
): Promise<Guard> {
  const s = await resolveSession(session);
  if (!s) return UNAUTH;
  return (await canManageDivision(divisionId, s)) ? { ok: true, session: s } : DENIED;
}

export async function guardCustomButton(
  buttonId: string,
  session?: AdminSession | null
): Promise<Guard> {
  const s = await resolveSession(session);
  if (!s) return UNAUTH;
  return (await canManageCustomButton(buttonId, s)) ? { ok: true, session: s } : DENIED;
}

export async function guardGame(gameId: string, session?: AdminSession | null): Promise<Guard> {
  const s = await resolveSession(session);
  if (!s) return UNAUTH;
  return (await canManageGame(gameId, s)) ? { ok: true, session: s } : DENIED;
}

export async function guardRegistration(
  registrationId: string,
  session?: AdminSession | null
): Promise<Guard> {
  const s = await resolveSession(session);
  if (!s) return UNAUTH;
  return (await canManageRegistration(registrationId, s)) ? { ok: true, session: s } : DENIED;
}
