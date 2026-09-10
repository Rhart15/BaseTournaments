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

export type Guard =
  | { ok: true; session: AdminSession }
  | { ok: false; status: number; error: string };

const DENIED: Guard = {
  ok: false,
  status: 403,
  error: "You don't have access to this tournament.",
};
const UNAUTH: Guard = { ok: false, status: 401, error: "Unauthorized" };

export async function guardAdmin(): Promise<Guard> {
  const session = await getAdminSession();
  return session ? { ok: true, session } : UNAUTH;
}

export async function guardLeadAdmin(): Promise<Guard> {
  const session = await getAdminSession();
  if (!session) return UNAUTH;
  if (!isLeadAdmin(session)) {
    return { ok: false, status: 403, error: "Only a lead admin can do this." };
  }
  return { ok: true, session };
}

export async function guardTournament(tournamentId: string): Promise<Guard> {
  const session = await getAdminSession();
  if (!session) return UNAUTH;
  return (await canManageTournament(tournamentId, session)) ? { ok: true, session } : DENIED;
}

export async function guardDivision(divisionId: string): Promise<Guard> {
  const session = await getAdminSession();
  if (!session) return UNAUTH;
  return (await canManageDivision(divisionId, session)) ? { ok: true, session } : DENIED;
}

export async function guardGame(gameId: string): Promise<Guard> {
  const session = await getAdminSession();
  if (!session) return UNAUTH;
  return (await canManageGame(gameId, session)) ? { ok: true, session } : DENIED;
}

export async function guardRegistration(registrationId: string): Promise<Guard> {
  const session = await getAdminSession();
  if (!session) return UNAUTH;
  return (await canManageRegistration(registrationId, session)) ? { ok: true, session } : DENIED;
}
