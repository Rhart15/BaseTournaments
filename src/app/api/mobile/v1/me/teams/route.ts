import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileSession } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

// The signed-in user's teams: a coach's own teams (Team.coachUserId), or
// a parent's linked teams (TeamParent). Each entry is enough to route
// into GET /api/mobile/v1/teams/[id] for the full detail.
export async function GET(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "COACH") {
    const teams = await prisma.team.findMany({
      where: { coachUserId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, ageGroup: true, homeCity: true, homeState: true, logoUrl: true },
    });
    return NextResponse.json({ teams, as: "coach" });
  }

  if (session.user.role === "PARENT") {
    const links = await prisma.teamParent.findMany({
      where: { userId: session.user.id },
      select: {
        athleteName: true,
        team: {
          select: { id: true, name: true, ageGroup: true, homeCity: true, homeState: true, logoUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      teams: links.map((l) => ({ ...l.team, athleteName: l.athleteName })),
      as: "parent",
    });
  }

  return NextResponse.json({ teams: [], as: session.user.role.toLowerCase() });
}
