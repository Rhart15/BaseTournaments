import { BracketsManager } from "brackets-manager";
import { InMemoryDatabase } from "brackets-memory-db";
import type { Registration } from "@prisma/client";

// brackets-manager handles elimination-bracket structure and advancement
// logic (single/double elim, byes, seeding slots). Pool play standings are
// computed separately (below) since round-robin pool play isn't part of
// what the library manages -- we only hand it the seeded order once pools
// are done.

export function createBracketManager() {
  const storage = new InMemoryDatabase();
  return { manager: new BracketsManager(storage), storage };
}

/**
 * Rank pool-play teams by win %, then run differential, then head-to-head
 * runs allowed, matching standard youth tournament tiebreaker rules.
 * Returns team registration IDs in seed order (best team first).
 */
export function seedFromPoolStandings(teams: Registration[]): string[] {
  return [...teams]
    .sort((a, b) => {
      const winPctA = winPercentage(a);
      const winPctB = winPercentage(b);
      if (winPctB !== winPctA) return winPctB - winPctA;

      const diffA = a.runsFor - a.runsAgainst;
      const diffB = b.runsFor - b.runsAgainst;
      if (diffB !== diffA) return diffB - diffA;

      return a.runsAgainst - b.runsAgainst; // fewest runs allowed wins ties
    })
    .map((team) => team.id);
}

function winPercentage(team: Registration): number {
  const gamesPlayed = team.poolWins + team.poolLosses;
  if (gamesPlayed === 0) return 0;
  return team.poolWins / gamesPlayed;
}

/**
 * Creates a single or double elimination bracket (via brackets-manager)
 * from a seeded list of team names. Byes are inserted automatically by
 * the library when the team count isn't a power of two.
 */
export async function generateBracket(
  manager: BracketsManager,
  opts: {
    tournamentId: string;
    divisionLabel: string;
    seededTeamNames: string[]; // index 0 = top seed
    doubleElimination: boolean;
  }
) {
  await manager.create.stage({
    tournamentId: 0, // scoped per-division at the app level, not here
    name: `${opts.divisionLabel} Bracket`,
    type: opts.doubleElimination ? "double_elimination" : "single_elimination",
    seeding: opts.seededTeamNames,
    settings: { seedOrdering: ["natural"] },
  });

  return manager.get.stageData(0);
}

/**
 * Pushes any auto-finalized bye's "winner" into the next round's open
 * slot, and cascades that forward through the bracket (a next-round game
 * can itself become a bye if both its feeders were byes). Byes never go
 * through the normal score-entry route, and manual reseeding in the
 * bracket editor can also leave this stale, so both the bracket
 * generator and the slot-swap route call this after they change
 * anything.
 */
export async function propagateByeAdvancement(
  prisma: import("@prisma/client").PrismaClient,
  divisionId: string
) {
  const bracketGameCount = await prisma.game.count({
    where: { divisionId, stage: "BRACKET" },
  });
  const passes = Math.ceil(Math.log2(Math.max(bracketGameCount, 2))) + 1;

  for (let pass = 0; pass < passes; pass++) {
    const allGames = await prisma.game.findMany({
      where: { divisionId, stage: "BRACKET" },
    });

    for (const g of allGames) {
      if (g.status !== "FINAL" || !g.advancesToGameId) continue;
      const winnerId =
        g.homeTeamId && !g.awayTeamId
          ? g.homeTeamId
          : g.awayTeamId && !g.homeTeamId
          ? g.awayTeamId
          : (g.homeScore ?? 0) > (g.awayScore ?? 0)
          ? g.homeTeamId
          : g.awayTeamId;
      if (!winnerId) continue;

      const target = allGames.find((x) => x.id === g.advancesToGameId);
      if (!target) continue;
      if (target.homeTeamId === winnerId || target.awayTeamId === winnerId) continue;

      const slotField = target.homeTeamId ? "awayTeamId" : "homeTeamId";
      if (target[slotField]) continue;

      await prisma.game.update({
        where: { id: target.id },
        data: { [slotField]: winnerId },
      });
    }

    const refreshed = await prisma.game.findMany({
      where: { divisionId, stage: "BRACKET" },
    });
    for (const g of refreshed) {
      if (g.status === "FINAL") continue;
      const feeders = refreshed.filter((x) => x.advancesToGameId === g.id);
      const bothFeedersDone =
        feeders.length === 2 && feeders.every((f) => f.status === "FINAL");
      const exactlyOneTeamPresent = Boolean(g.homeTeamId) !== Boolean(g.awayTeamId);
      if (bothFeedersDone && exactlyOneTeamPresent) {
        await prisma.game.update({
          where: { id: g.id },
          data: {
            status: "FINAL",
            homeScore: g.homeTeamId ? 1 : null,
            awayScore: g.awayTeamId ? 1 : null,
          },
        });
      }
    }
  }
}
