import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileSession } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

// Team detail: schedule/registration/payment status across every
// tournament the team is signed up for. Viewable by an admin, the
// coach who owns the team, or a parent linked to it via TeamParent
// (join /api/mobile/v1/teams/[id]/join). Deliberately read-only and
// scoped to what a parent needs -- registration/payment status and
// bracket position -- not roster or staff management, which stay
// web-only for now.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ageGroup: true,
      homeCity: true,
      homeState: true,
      logoUrl: true,
      coachUserId: true,
      registrations: {
        select: {
          id: true,
          status: true,
          paidAt: true,
          divisionId: true,
          tournamentId: true,
          poolWins: true,
          poolLosses: true,
          bracketWins: true,
          bracketLosses: true,
          finalPlacement: true,
          tournament: { select: { id: true, name: true, startDate: true, endDate: true } },
          division: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwningCoach = team.coachUserId === session.user.id;
  const isLinkedParent =
    !isAdmin &&
    !isOwningCoach &&
    Boolean(
      await prisma.teamParent.findUnique({
        where: { teamId_userId: { teamId: id, userId: session.user.id } },
      })
    );

  if (!isAdmin && !isOwningCoach && !isLinkedParent) {
    return NextResponse.json({ error: "You don't have access to this team." }, { status: 403 });
  }

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      ageGroup: team.ageGroup,
      homeCity: team.homeCity,
      homeState: team.homeState,
      logoUrl: team.logoUrl,
      registrations: team.registrations,
    },
  });
}
