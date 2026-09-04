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

  const game = await prisma.game.update({
    where: { id },
    data: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      status: "FINAL",
    },
    include: { homeTeam: true, awayTeam: true },
  });

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

  return NextResponse.json({ game });
}
