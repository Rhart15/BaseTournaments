import { NextRequest, NextResponse } from "next/server";
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

  const championship = games.find((g) => g.round === "Championship");

  if (!championship || championship.status !== "FINAL") {
    return NextResponse.json(
      { error: "Championship game isn't final yet" },
      { status: 400 }
    );
  }

  const champHome = championship.homeScore ?? 0;
  const champAway = championship.awayScore ?? 0;
  const championId =
    champHome > champAway ? championship.homeTeamId : championship.awayTeamId;
  const runnerUpId =
    champHome > champAway ? championship.awayTeamId : championship.homeTeamId;

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

  // Every other completed bracket game: the loser's tournament ended
  // there, so label them by the round they were eliminated in.
  for (const game of games) {
    if (game.round === "Championship") continue;
    if (game.status !== "FINAL") continue;
    if (!game.homeTeamId || !game.awayTeamId) continue; // bye, not a real loss

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
