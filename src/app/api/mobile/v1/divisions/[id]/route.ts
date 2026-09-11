import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileAdminSession } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

// Public schedule/standings/bracket for one division -- the mobile
// equivalent of /tournaments/[id]/divisions/[divisionId]. No auth
// required to view, but bracket-stage games are withheld until the
// admin publishes the bracket (division.bracketPublished), same gate
// DivisionTabs.tsx applies on the website (canSee = bracketPublished ||
// isAdmin) -- an optional bearer token lets an admin preview it early.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const adminSession = await getMobileAdminSession(req);
  const isAdmin = Boolean(adminSession);

  const division = await prisma.division.findUnique({
    where: { id },
    select: {
      id: true,
      label: true,
      usePoolPlay: true,
      gameGuarantee: true,
      resultsFinalized: true,
      bracketPublished: true,
      tournament: { select: { id: true, name: true, sport: true } },
      pools: { select: { id: true, label: true }, orderBy: { label: "asc" } },
      registrations: {
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        select: {
          id: true,
          teamName: true,
          poolId: true,
          pool: { select: { id: true, label: true } },
          poolWins: true,
          poolLosses: true,
          runsFor: true,
          runsAgainst: true,
        },
      },
      games: {
        select: {
          id: true,
          stage: true,
          round: true,
          poolId: true,
          pool: { select: { id: true, label: true } },
          homeTeam: { select: { id: true, teamName: true } },
          awayTeam: { select: { id: true, teamName: true } },
          homeScore: true,
          awayScore: true,
          status: true,
          fieldName: true,
          startTime: true,
          advancesToGameId: true,
          loserAdvancesToGameId: true,
        },
        orderBy: [{ startTime: "asc" }, { round: "asc" }],
      },
    },
  });

  if (!division) {
    return NextResponse.json({ error: "Division not found." }, { status: 404 });
  }

  const canSeeBracket = division.bracketPublished || isAdmin;
  const games = canSeeBracket
    ? division.games
    : division.games.filter((g) => g.stage !== "BRACKET");

  return NextResponse.json({
    division: {
      id: division.id,
      label: division.label,
      usePoolPlay: division.usePoolPlay,
      gameGuarantee: division.gameGuarantee,
      resultsFinalized: division.resultsFinalized,
      bracketPublished: division.bracketPublished,
      tournament: division.tournament,
      pools: division.pools,
      registrations: division.registrations,
      games,
    },
  });
}
