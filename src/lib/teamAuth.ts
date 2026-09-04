import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Used by every route that lets a coach manage their own team's roster,
// staff, logo, or documents. An admin can always manage any team; a
// coach can only manage the team their account is linked to
// (Team.coachUserId). Anyone else -- including someone who isn't
// logged in at all -- is refused, since these routes handle personal
// data (rosters, background-check files) that shouldn't be editable by
// just knowing a team's id.
export async function canManageTeam(teamId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { coachUserId: true },
  });
  return Boolean(team && session.user.id && team.coachUserId === session.user.id);
}

// Same idea for a single tournament Registration. A registration made
// by a logged-in coach (teamId set at checkout) can be managed by that
// coach or an admin. Older/anonymous registrations (no teamId, made
// before a coach account existed or without logging in) can only be
// managed by an admin -- there's no reliable way to verify who made
// them otherwise.
export async function canManageRegistration(registrationId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { teamId: true },
  });
  if (!registration?.teamId) return false;

  const team = await prisma.team.findUnique({
    where: { id: registration.teamId },
    select: { coachUserId: true },
  });
  return Boolean(team && session.user.id && team.coachUserId === session.user.id);
}
