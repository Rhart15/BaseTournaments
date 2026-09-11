import { prisma } from "@/lib/db";

// Shared by the website's score-entry route (src/app/api/games/[id]/score)
// and the mobile equivalent (src/app/api/mobile/v1/admin/games/[id]/score)
// so this logic -- standings updates, bracket win/loss tallies, winner
// and loser advancement -- lives in exactly one place. Caller is
// responsible for auth (guardGame) and input validation before calling.
export async function applyGameScore(gameId: string, homeScore: number, awayScore: number) {
  // Advancement (pushing a winner/loser into the next game slot) must
  // only ever happen once per game -- re-saving an already-FINAL game
  // (a correction, a double click, a retry) would otherwise push the
  // same team into the next open slot a second time, landing it on top
  // of whoever is actually supposed to be there.
  const existing = await prisma.game.findUnique({ where: { id: gameId } });
  const isFirstFinalization = existing?.status !== "FINAL";

  const game = await prisma.game.update({
    where: { id: gameId },
    data: { homeScore, awayScore, status: "FINAL" },
    include: { homeTeam: true, awayTeam: true },
  });

  if (!isFirstFinalization) {
    // Score corrected after the fact -- leave standings and bracket
    // advancement alone; only the score itself changes.
    return game;
  }

  // Pool-stage games roll into each team's standing record so seeding
  // reflects the result immediately.
  if (game.stage === "POOL" && game.homeTeamId && game.awayTeamId) {
    const homeWon = homeScore > awayScore;

    await prisma.registration.update({
      where: { id: game.homeTeamId },
      data: {
        poolWins: { increment: homeWon ? 1 : 0 },
        poolLosses: { increment: homeWon ? 0 : 1 },
        runsFor: { increment: homeScore },
        runsAgainst: { increment: awayScore },
      },
    });
    await prisma.registration.update({
      where: { id: game.awayTeamId },
      data: {
        poolWins: { increment: homeWon ? 0 : 1 },
        poolLosses: { increment: homeWon ? 1 : 0 },
        runsFor: { increment: awayScore },
        runsAgainst: { increment: homeScore },
      },
    });
  }

  // Bracket-stage games also roll into each team's record, so results
  // are logged onto the team automatically as they're entered live.
  if (game.stage === "BRACKET" && game.homeTeamId && game.awayTeamId) {
    const homeWon = homeScore > awayScore;

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
    const winnerId = homeScore > awayScore ? game.homeTeamId : game.awayTeamId;

    const nextGame = await prisma.game.findUnique({ where: { id: game.advancesToGameId } });
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
    const loserId = homeScore > awayScore ? game.awayTeamId : game.homeTeamId;

    const lbGame = await prisma.game.findUnique({ where: { id: game.loserAdvancesToGameId } });
    if (lbGame && loserId) {
      const slotField = lbGame.homeTeamId ? "awayTeamId" : "homeTeamId";
      await prisma.game.update({
        where: { id: lbGame.id },
        data: { [slotField]: loserId },
      });
    }
  }

  return game;
}
