import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const scoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

// TODO: gate this behind admin/staff auth before go-live -- anyone who can
// reach this route can currently overwrite a live score.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = scoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  // Advancement (pushing a winner/loser into the next game slot) must
  // only ever happen once per game -- re-saving an already-FINAL game
  // (a correction, a double click, a retry) would otherwise push the
  // same team into the next open slot a second time, landing it on
  // top of whoever is actually supposed to be there.
  const existing = await prisma.game.findUnique({ where: { id } });
  const isFirstFinalization = existing?.status !== "FINAL";

  const game = await prisma.game.update({
    where: { id },
    data: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      status: "FINAL",
    },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!isFirstFinalization) {
    // Score corrected after the fact -- leave standings and bracket
    // advancement alone; only the score itself changes.
    return NextResponse.json({ game });
  }

  // Pool-stage games roll into each team's standing record so seeding
  // reflects the result immediately.
  if (game.stage === "POOL" && game.homeTeamId && game.awayTeamId) {
    const homeWon = parsed.data.homeScore > parsed.data.awayScore;

    await prisma.registration.update({
      where: { id: game.homeTeamId },
      data: {
        poolWins: { increment: homeWon ? 1 : 0 },
        poolLosses: { increment: homeWon ? 0 : 1 },
        runsFor: { increment: parsed.data.homeScore },
        runsAgainst: { increment: parsed.data.awayScore },
      },
    });
    await prisma.registration.update({
      where: { id: game.awayTeamId },
      data: {
        poolWins: { increment: homeWon ? 0 : 1 },
        poolLosses: { increment: homeWon ? 1 : 0 },
        runsFor: { increment: parsed.data.awayScore },
        runsAgainst: { increment: parsed.data.homeScore },
      },
    });
  }

  // Bracket-stage games also roll into each team's record, so results
  // are logged onto the team automatically as they're entered live.
  if (game.stage === "BRACKET" && game.homeTeamId && game.awayTeamId) {
    const homeWon = parsed.data.homeScore > parsed.data.awayScore;

    await prisma.registration.update({
      where: { id: game.homeTeamId },
      data: {
        bracketWins: { increment: homeWon ? 1 : 0 },
        bracketLosses: { increment: homeWon ? 0 : 1 },
      },
    });
    await prisma.registration.update({
      where: { id: game.awayTeamId },
      data: {
        bracketWins: { increment: homeWon ? 0 : 1 },
        bracketLosses: { increment: homeWon ? 1 : 0 },
      },
    });
  }

  // Bracket-stage advancement: push the winner into the next game slot.
  if (game.stage === "BRACKET" && game.advancesToGameId) {
    const winnerId =
      parsed.data.homeScore > parsed.data.awayScore
        ? game.homeTeamId
        : game.awayTeamId;

    const nextGame = await prisma.game.findUnique({
      where: { id: game.advancesToGameId },
    });
    if (nextGame) {
      const slotField = nextGame.homeTeamId ? "awayTeamId" : "homeTeamId";
      await prisma.game.update({
        where: { id: nextGame.id },
        data: { [slotField]: winnerId },
      });
    }
  }

  // Double-elimination advancement: push the loser into their losers-
  // bracket game, same as the winner above.
  if (game.stage === "BRACKET" && game.loserAdvancesToGameId) {
    const loserId =
      parsed.data.homeScore > parsed.data.awayScore
        ? game.awayTeamId
        : game.homeTeamId;

    const lbGame = await prisma.game.findUnique({
      where: { id: game.loserAdvancesToGameId },
    });
    if (lbGame && loserId) {
      const slotField = lbGame.homeTeamId ? "awayTeamId" : "homeTeamId";
      await prisma.game.update({
        where: { id: lbGame.id },
        data: { [slotField]: loserId },
      });
    }
  }

  return NextResponse.json({ game });
}
