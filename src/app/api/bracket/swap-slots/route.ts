import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Side = "home" | "away";

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
  if (gameA.status === "FINAL" || gameB.status === "FINAL") {
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

  await prisma.game.update({ where: { id: gameAId }, data: { [fieldA]: teamB } });
  await prisma.game.update({ where: { id: gameBId }, data: { [fieldB]: teamA } });

  return NextResponse.json({ ok: true });
}
