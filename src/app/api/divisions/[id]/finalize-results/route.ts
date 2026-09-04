import { NextRequest, NextResponse } from "next/server";
import type { Game } from "@prisma/client";
import { prisma } from "@/lib/db";

// Called by the admin once a division's bracket is done. Reads the
// completed bracket games and writes a finalPlacement onto each team's
// Registration -- this is what makes the team's Tournament History page
// auto-fill instead of just sitting on "PAID".
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: divisionId } = await params;

  const games = await prisma.game.findMany({
    where: { divisionId, stage: "BRACKET" },
  });

  if (games.length === 0) {
    return NextResponse.json(
      { error: "No bracket for this division yet" },
      { status: 400 }
    );
  }

  // A Grand Final decides a double-elimination bracket; older
  // single-elimination brackets (no losers bracket built) fall back to
  // the Championship game instead.
  const decidingGame =
    games.find((g: Game) => g.round === "Grand Final") ??
    games.find((g: Game) => g.round === "Championship");

  if (!decidingGame || decidingGame.status !== "FINAL") {
    return NextResponse.json(
      { error: "The final game isn't scored yet" },
      { status: 400 }
    );
  }

  const decHome = decidingGame.homeScore ?? 0;
  const decAway = decidingGame.awayScore ?? 0;
  const championId =
    decHome > decAway ? decidingGame.homeTeamId : decidingGame.awayTeamId;
  const runnerUpId =
    decHome > decAway ? decidingGame.awayTeamId : decidingGame.homeTeamId;

  if (championId) {
    await prisma.registration.update({
      where: { id: championId },
      data: { finalPlacement: "Champion" },
    });
  }
  if (runnerUpId) {
    await prisma.registration.update({
      where: { id: runnerUpId },
      data: { finalPlacement: "Runner-up" },
    });
  }

  // Every other completed bracket game: figure out whether the loser's
  // tournament actually ended there. In a double-elimination bracket, a
  // loss in the winners bracket just sends them to the losers bracket
  // (loserAdvancesToGameId is set) -- that's not elimination. A loss in
  // the losers bracket, or in a single-elimination bracket with no
  // losers bracket at all, does end it.
  for (const game of games) {
    if (game.id === decidingGame.id) continue;
    if (game.status !== "FINAL") continue;
    if (!game.homeTeamId || !game.awayTeamId) continue; // bye, not a real loss

    const isLosersBracketGame = (game.round ?? "").startsWith("Losers Round");
    const sendsLoserOnward = Boolean(game.loserAdvancesToGameId);
    if (!isLosersBracketGame && sendsLoserOnward) continue; // still alive in the LB

    const home = game.homeScore ?? 0;
    const away = game.awayScore ?? 0;
    const loserId = home > away ? game.awayTeamId : game.homeTeamId;

    await prisma.registration.update({
      where: { id: loserId },
      data: { finalPlacement: `Lost in ${game.round ?? "bracket play"}` },
    });
  }

  await prisma.division.update({
    where: { id: divisionId },
    data: { resultsFinalized: true },
  });

  return NextResponse.json({ ok: true });
}
