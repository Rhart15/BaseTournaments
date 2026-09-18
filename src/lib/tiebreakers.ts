// Shared pool-play ranking logic, used both to seed a bracket from pool
// standings (Tournament.seedingTiebreakerOrder) and to render the public
// pool/division/overall standings tables (Tournament.poolTiebreakerOrder).
// Deliberately dependency-free (no Prisma import) so it's safe to use from
// both server code and a "use client" component without pulling anything
// heavy into the browser bundle.

export type TiebreakerRule =
  | "HEAD_TO_HEAD"
  | "RUN_DIFFERENTIAL"
  | "RUNS_ALLOWED"
  | "RUNS_SCORED"
  | "FEWEST_LOSSES"
  | "FORFEIT_RECORD"
  | "STRENGTH_OF_SCHEDULE"
  | "COIN_FLIP";

// Matches the pre-existing hardcoded behavior (run differential, then
// fewest runs allowed) -- used whenever a tournament hasn't configured its
// own tiebreaker order, so nothing changes for events that predate this.
export const DEFAULT_TIEBREAKER_ORDER: TiebreakerRule[] = ["RUN_DIFFERENTIAL", "RUNS_ALLOWED"];

export type TiebreakerTeam = {
  id: string;
  poolWins: number;
  poolLosses: number;
  runsFor: number;
  runsAgainst: number;
};

export type TiebreakerGame = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // "FINAL" is the only value this module cares about
};

/**
 * Ranks teams by win percentage first (the fundamental pool-standings
 * metric, not itself configurable), then applies `tiebreakerOrder`'s rules
 * in sequence to break ties within the same win percentage -- falling
 * through to the next rule only when the current one is a genuine tie.
 * Falls back to DEFAULT_TIEBREAKER_ORDER when `tiebreakerOrder` is empty.
 *
 * `poolGames` should be every FINAL pool-stage game among the teams being
 * ranked (head-to-head and strength-of-schedule both need it); passing a
 * narrower or wider set than the teams actually being compared just means
 * head-to-head/SOS have less signal, not incorrect results.
 */
export function rankTeamsByTiebreakers<T extends TiebreakerTeam>(
  teams: T[],
  poolGames: TiebreakerGame[],
  tiebreakerOrder: TiebreakerRule[]
): T[] {
  const order = tiebreakerOrder.length > 0 ? tiebreakerOrder : DEFAULT_TIEBREAKER_ORDER;

  const winPct = new Map(teams.map((t) => [t.id, winPercentage(t)]));
  const sos = new Map(teams.map((t) => [t.id, strengthOfSchedule(t.id, teams, poolGames)]));
  // Assigned once per team up front, not re-rolled per comparison -- a
  // comparator that calls Math.random() itself can make the same pair
  // compare inconsistently across calls, which is an invalid sort.
  const coinFlip = new Map(teams.map((t) => [t.id, Math.random()]));

  function headToHead(a: T, b: T): number {
    const game = poolGames.find(
      (g) =>
        g.status === "FINAL" &&
        g.homeScore !== null &&
        g.awayScore !== null &&
        g.homeScore !== g.awayScore &&
        ((g.homeTeamId === a.id && g.awayTeamId === b.id) ||
          (g.homeTeamId === b.id && g.awayTeamId === a.id))
    );
    if (!game) return 0; // never played each other, unfinished, or tied

    const aWon =
      (game.homeTeamId === a.id && game.homeScore! > game.awayScore!) ||
      (game.awayTeamId === a.id && game.awayScore! > game.homeScore!);
    return aWon ? -1 : 1;
  }

  function comparatorFor(rule: TiebreakerRule): (a: T, b: T) => number {
    switch (rule) {
      case "HEAD_TO_HEAD":
        return headToHead;
      case "RUN_DIFFERENTIAL":
        return (a, b) => b.runsFor - b.runsAgainst - (a.runsFor - a.runsAgainst);
      case "RUNS_ALLOWED":
        return (a, b) => a.runsAgainst - b.runsAgainst;
      case "RUNS_SCORED":
        return (a, b) => b.runsFor - a.runsFor;
      case "FEWEST_LOSSES":
        return (a, b) => a.poolLosses - b.poolLosses;
      case "FORFEIT_RECORD":
        // No forfeit tracking exists anywhere in the schema yet (no flag
        // on Game or count on Registration) -- documented no-op until
        // that data exists, rather than fabricating a signal.
        return () => 0;
      case "STRENGTH_OF_SCHEDULE":
        return (a, b) => (sos.get(b.id) ?? 0) - (sos.get(a.id) ?? 0);
      case "COIN_FLIP":
        return (a, b) => (coinFlip.get(a.id) ?? 0) - (coinFlip.get(b.id) ?? 0);
      default:
        return () => 0;
    }
  }

  const comparators = order.map(comparatorFor);

  return [...teams].sort((a, b) => {
    const pctDiff = (winPct.get(b.id) ?? 0) - (winPct.get(a.id) ?? 0);
    if (pctDiff !== 0) return pctDiff;

    for (const cmp of comparators) {
      const result = cmp(a, b);
      if (result !== 0) return result;
    }

    // Every configured rule tied -- deterministic fallback so repeated
    // calls with the same input give the same output, rather than
    // leaving it to whatever order the input array happened to be in.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function winPercentage(team: Pick<TiebreakerTeam, "poolWins" | "poolLosses">): number {
  const gamesPlayed = team.poolWins + team.poolLosses;
  return gamesPlayed === 0 ? 0 : team.poolWins / gamesPlayed;
}

/**
 * Average win percentage of the pool opponents `teamId` actually played,
 * derived from existing Game/Registration data -- not an established
 * "the" SOS formula, just a reasonable one since none exists in this
 * codebase to defer to.
 */
function strengthOfSchedule<T extends TiebreakerTeam>(
  teamId: string,
  allTeams: T[],
  poolGames: TiebreakerGame[]
): number {
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const opponentIds = new Set<string>();
  for (const g of poolGames) {
    if (g.homeTeamId === teamId && g.awayTeamId) opponentIds.add(g.awayTeamId);
    if (g.awayTeamId === teamId && g.homeTeamId) opponentIds.add(g.homeTeamId);
  }
  if (opponentIds.size === 0) return 0;

  let total = 0;
  for (const oppId of opponentIds) {
    const opponent = teamById.get(oppId);
    if (opponent) total += winPercentage(opponent);
  }
  return total / opponentIds.size;
}
