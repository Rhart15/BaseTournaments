import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { propagateByeAdvancement } from "@/lib/brackets";

type Side = "home" | "away";

const isRealFinal = (g: { status: string; homeTeamId: string | null; awayTeamId: string | null }) =>
  g.status === "FINAL" && Boolean(g.homeTeamId) && Boolean(g.awayTeamId);

// Lets an admin drag a team from one bracket slot to another before the
// bracket goes live -- swaps whichever team currently sits in each slot.
// Blocked once either game has already been played, since that's a real
// recorded result, not a seeding placeholder anymore.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { gameAId, gameASide, gameBId, gameBSide } = body as {
    gameAId: string;
    gameASide: Side;
    gameBId: string;
    gameBSide: Side;
  };

  if (!gameAId || !gameBId || !gameASide || !gameBSide) {
    return NextResponse.json({ error: "Missing slot info" }, { status: 400 });
  }

  const [gameA, gameB] = await Promise.all([
    prisma.game.findUnique({ where: { id: gameAId } }),
    prisma.game.findUnique({ where: { id: gameBId } }),
  ]);

  if (!gameA || !gameB || gameA.stage !== "BRACKET" || gameB.stage !== "BRACKET") {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (isRealFinal(gameA) || isRealFinal(gameB)) {
    return NextResponse.json(
      { error: "Can't move teams once a game has been played." },
      { status: 400 }
    );
  }

  const fieldA = gameASide === "home" ? "homeTeamId" : "awayTeamId";
  const fieldB = gameBSide === "home" ? "homeTeamId" : "awayTeamId";

  const teamA = gameA[fieldA];
  const teamB = gameB[fieldB];

  if (gameAId === gameBId && fieldA === fieldB) {
    return NextResponse.json({ ok: true }); // no-op, dropped on itself
  }

  // If either slot being moved was an auto-finalized bye, it may have
  // already pushed its "winner" into the next round. That's about to go
  // stale, so pull it back out (as long as the next game hasn't actually
  // been played yet) before we touch anything else.
  for (const g of [gameA, gameB]) {
    if (g.status !== "FINAL" || !g.advancesToGameId) continue;
    const oldWinner = g.homeTeamId ?? g.awayTeamId;
    if (!oldWinner) continue;
    const target = await prisma.game.findUnique({ where: { id: g.advancesToGameId } });
    if (!target || isRealFinal(target)) continue;
    const clearField =
      target.homeTeamId === oldWinner
        ? "homeTeamId"
        : target.awayTeamId === oldWinner
        ? "awayTeamId"
        : null;
    if (clearField) {
      await prisma.game.update({ where: { id: target.id }, data: { [clearField]: null } });
    }
  }

  await prisma.game.update({ where: { id: gameAId }, data: { [fieldA]: teamB } });
  await prisma.game.update({ where: { id: gameBId }, data: { [fieldB]: teamA } });

  // Recompute whether each affected game is now a bye (exactly one team),
  // a real matchup waiting to be played (both teams), or empty.
  for (const id of new Set([gameAId, gameBId])) {
    const g = await prisma.game.findUnique({ where: { id } });
    if (!g) continue;
    const hasHome = Boolean(g.homeTeamId);
    const hasAway = Boolean(g.awayTeamId);
    if (hasHome && hasAway) {
      await prisma.game.update({
        where: { id },
        data: { status: "SCHEDULED", homeScore: null, awayScore: null },
      });
    } else {
      await prisma.game.update({
        where: { id },
        data: {
          status: "FINAL",
          homeScore: hasHome ? 1 : null,
          awayScore: hasAway ? 1 : null,
        },
      });
    }
  }

  await propagateByeAdvancement(prisma, gameA.divisionId);

  return NextResponse.json({ ok: true });
}
