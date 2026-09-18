// Pure schedule-generation algorithm -- no Prisma import (same
// dependency-free pattern as tiebreakers.ts / checkoutMath.ts), so it's
// unit-testable with plain data and safe to import anywhere.
//
// Scope: this ONLY assigns venue+field+start time to Game rows that
// already exist (created by the pre-existing pool-schedule/bracket
// generators). It never creates, deletes, or re-pairs games.
//
// Correctness argument for bracket games (see the "wave" concept below):
// a bracket game beyond Round 1 has no known teams yet at generation
// time, but the bracket graph itself guarantees a team can never be "in"
// two games at the same topological depth -- every team has exactly one
// live path through the bracket (winner's side or loser's side) at any
// given depth. So instead of checking concrete team ids for those games,
// we schedule by depth: every game at depth N is given a start time no
// earlier than the expected finish of every depth-(N-1) game that feeds
// it, and games at the same depth run in parallel across fields.

export const DEFAULT_GAME_MINUTES = 75;
export const DEFAULT_BREAK_MINUTES = 15;
const MINUTE_MS = 60_000;
// Safety cap on candidate-time advances per game, so a pathological
// config (e.g. a daily window shorter than one game) can't hang instead
// of just reporting an overflow.
const MAX_CANDIDATE_STEPS = 3000;

export type ScheduleGame = {
  id: string;
  divisionId: string;
  divisionSortOrder: number;
  durationMinutes: number;
  stage: "POOL" | "BRACKET";
  round: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  advancesToGameId: string | null;
  loserAdvancesToGameId: string | null;
  venueId: string | null;
  fieldNumber: number | null;
  startTime: Date | null;
  scheduleLocked: boolean;
};

export type FieldResource = { venueId: string; fieldNumber: number };

export type GenerateScheduleInput = {
  /** Every game across the whole tournament (all divisions). */
  games: ScheduleGame[];
  fields: FieldResource[];
  startDate: Date;
  endDate: Date;
  /** Minutes since midnight, e.g. 8:00am = 480. */
  dailyStartMinutes: number;
  dailyEndMinutes: number;
  stepMinutes: number;
  maxGamesPerDay: number | null;
  /**
   * "fill" only assigns games with no slot yet (never touches an
   * already-scheduled game, locked or not) -- safe to re-run any time.
   * "regenerate" reassigns every non-locked game (and locked ones too if
   * includeLocked is set) -- the deliberate, confirmed action.
   */
  mode: "fill" | "regenerate";
  includeLocked: boolean;
};

export type GameAssignment = {
  gameId: string;
  venueId: string;
  fieldNumber: number;
  startTime: Date;
};

export type GenerateScheduleResult = {
  assignments: GameAssignment[];
  /** No venues attached to the tournament -- nothing could be scheduled. */
  noVenues: boolean;
  /** Games placed past the configured end date (window too small for the field). */
  overflowCount: number;
  scheduledCount: number;
  /** Games left exactly as they were (already scheduled, not reassigned). */
  keptCount: number;
};

function parseRoundNumber(label: string): number {
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * One division's games, ordered into "waves" -- pool rounds first (by
 * round number, since round-robin construction guarantees no team plays
 * twice within one round, across all pools in the division at once),
 * then bracket games by topological depth over the advancement graph.
 */
export function computeWavesForDivision(games: ScheduleGame[]): ScheduleGame[][] {
  const poolGames = games.filter((g) => g.stage === "POOL");
  const bracketGames = games.filter((g) => g.stage === "BRACKET");

  const poolGroups = new Map<string, ScheduleGame[]>();
  for (const g of poolGames) {
    const key = g.round ?? "Pool";
    if (!poolGroups.has(key)) poolGroups.set(key, []);
    poolGroups.get(key)!.push(g);
  }
  const poolWaves = [...poolGroups.entries()]
    .sort((a, b) => parseRoundNumber(a[0]) - parseRoundNumber(b[0]))
    .map(([, gs]) => gs);

  const byId = new Map(bracketGames.map((g) => [g.id, g]));
  const incoming = new Map<string, string[]>();
  for (const g of bracketGames) {
    if (g.advancesToGameId && byId.has(g.advancesToGameId)) {
      incoming.set(g.advancesToGameId, [...(incoming.get(g.advancesToGameId) ?? []), g.id]);
    }
    if (g.loserAdvancesToGameId && byId.has(g.loserAdvancesToGameId)) {
      incoming.set(g.loserAdvancesToGameId, [...(incoming.get(g.loserAdvancesToGameId) ?? []), g.id]);
    }
  }
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  function computeDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // defensive: shouldn't happen for a real bracket graph
    visiting.add(id);
    const sources = incoming.get(id) ?? [];
    const d = sources.length === 0 ? 0 : 1 + Math.max(...sources.map(computeDepth));
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }
  for (const g of bracketGames) computeDepth(g.id);
  const maxDepth = bracketGames.length ? Math.max(...bracketGames.map((g) => depth.get(g.id)!)) : -1;
  const bracketWaves: ScheduleGame[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    bracketWaves.push(bracketGames.filter((g) => depth.get(g.id) === d));
  }

  return [...poolWaves, ...bracketWaves];
}

function combineDateAndMinutes(date: Date, minutesSinceMidnight: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutesSinceMidnight);
  return d;
}

function dateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  return dateOnly(date).getTime().toString();
}

function overlaps(list: { start: number; end: number }[], start: number, end: number): boolean {
  return list.some((iv) => start < iv.end && end > iv.start);
}

export function generateSchedule(input: GenerateScheduleInput): GenerateScheduleResult {
  const {
    games,
    fields,
    startDate,
    endDate,
    dailyStartMinutes,
    dailyEndMinutes,
    stepMinutes,
    maxGamesPerDay,
    mode,
    includeLocked,
  } = input;

  if (fields.length === 0) {
    return { assignments: [], noVenues: true, overflowCount: 0, scheduledCount: 0, keptCount: 0 };
  }

  const fieldBusy = new Map<string, { start: number; end: number }[]>();
  const teamBusy = new Map<string, { start: number; end: number }[]>();
  const gamesPerDay = new Map<string, number>();

  const fieldKey = (venueId: string, fieldNumber: number) => `${venueId}:${fieldNumber}`;
  function record(map: Map<string, { start: number; end: number }[]>, key: string, start: number, end: number) {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ start, end });
  }

  // Split into "fixed" (kept exactly as-is, occupying their slot) vs
  // "eligible" (to be placed/replaced) per the mode.
  const fixedGames: ScheduleGame[] = [];
  const eligibleGames: ScheduleGame[] = [];
  for (const g of games) {
    const hasSlot = g.venueId !== null && g.fieldNumber !== null && g.startTime !== null;
    if (!hasSlot) {
      eligibleGames.push(g);
    } else if (mode === "fill") {
      fixedGames.push(g);
    } else if (g.scheduleLocked && !includeLocked) {
      fixedGames.push(g);
    } else {
      eligibleGames.push(g);
    }
  }

  let keptCount = 0;
  for (const g of fixedGames) {
    if (!g.startTime || g.venueId === null || g.fieldNumber === null) continue;
    const start = g.startTime.getTime();
    const end = start + g.durationMinutes * MINUTE_MS;
    record(fieldBusy, fieldKey(g.venueId, g.fieldNumber), start, end);
    if (g.homeTeamId) record(teamBusy, g.homeTeamId, start, end);
    if (g.awayTeamId) record(teamBusy, g.awayTeamId, start, end);
    gamesPerDay.set(dateKey(g.startTime), (gamesPerDay.get(dateKey(g.startTime)) ?? 0) + 1);
    keptCount++;
  }

  const byDivision = new Map<string, ScheduleGame[]>();
  for (const g of eligibleGames) {
    if (!byDivision.has(g.divisionId)) byDivision.set(g.divisionId, []);
    byDivision.get(g.divisionId)!.push(g);
  }
  const perDivisionWaves = [...byDivision.entries()]
    .map(([, divGames]) => ({
      sortOrder: divGames[0].divisionSortOrder,
      waves: computeWavesForDivision(divGames),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const maxWaveCount = Math.max(0, ...perDivisionWaves.map((d) => d.waves.length));
  const mergedWaves: ScheduleGame[][] = [];
  for (let i = 0; i < maxWaveCount; i++) {
    const batch: ScheduleGame[] = [];
    for (const d of perDivisionWaves) if (d.waves[i]) batch.push(...d.waves[i]);
    if (batch.length) mergedWaves.push(batch);
  }

  const assignments: GameAssignment[] = [];
  let overflowCount = 0;
  let cursor = combineDateAndMinutes(startDate, dailyStartMinutes);
  const configuredEndDay = dateOnly(endDate).getTime();

  function isPastConfiguredRange(date: Date): boolean {
    return dateOnly(date).getTime() > configuredEndDay;
  }

  function startOfNextDayWindow(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + 1);
    return combineDateAndMinutes(next, dailyStartMinutes);
  }

  for (const batch of mergedWaves) {
    const batchStart = cursor;
    let latestEnd = batchStart.getTime();

    for (const game of batch) {
      let candidate = new Date(batchStart);
      let placed = false;
      let steps = 0;

      while (!placed && steps < MAX_CANDIDATE_STEPS) {
        steps++;
        const dayWindowEnd = combineDateAndMinutes(candidate, dailyEndMinutes);
        const candidateEndMs = candidate.getTime() + game.durationMinutes * MINUTE_MS;

        if (candidateEndMs > dayWindowEnd.getTime()) {
          candidate = startOfNextDayWindow(candidate);
          continue;
        }

        const dayKey = dateKey(candidate);
        const dayCount = gamesPerDay.get(dayKey) ?? 0;
        if (maxGamesPerDay !== null && dayCount >= maxGamesPerDay) {
          candidate = startOfNextDayWindow(candidate);
          continue;
        }

        const startMs = candidate.getTime();
        const endMs = candidateEndMs;

        const homeConflict = game.homeTeamId
          ? overlaps(teamBusy.get(game.homeTeamId) ?? [], startMs, endMs)
          : false;
        const awayConflict = game.awayTeamId
          ? overlaps(teamBusy.get(game.awayTeamId) ?? [], startMs, endMs)
          : false;
        if (homeConflict || awayConflict) {
          candidate = new Date(candidate.getTime() + stepMinutes * MINUTE_MS);
          continue;
        }

        const freeField = fields.find(
          (f) => !overlaps(fieldBusy.get(fieldKey(f.venueId, f.fieldNumber)) ?? [], startMs, endMs)
        );
        if (!freeField) {
          candidate = new Date(candidate.getTime() + stepMinutes * MINUTE_MS);
          continue;
        }

        // Placed.
        record(fieldBusy, fieldKey(freeField.venueId, freeField.fieldNumber), startMs, endMs);
        if (game.homeTeamId) record(teamBusy, game.homeTeamId, startMs, endMs);
        if (game.awayTeamId) record(teamBusy, game.awayTeamId, startMs, endMs);
        gamesPerDay.set(dayKey, dayCount + 1);
        if (isPastConfiguredRange(candidate)) overflowCount++;

        assignments.push({
          gameId: game.id,
          venueId: freeField.venueId,
          fieldNumber: freeField.fieldNumber,
          startTime: new Date(candidate),
        });
        latestEnd = Math.max(latestEnd, endMs);
        placed = true;
      }

      if (!placed) {
        // Exhausted the safety cap (pathological config) -- place it at
        // the last candidate tried rather than dropping it silently.
        overflowCount++;
        const freeField = fields[0];
        const startMs = candidate.getTime();
        const endMs = startMs + game.durationMinutes * MINUTE_MS;
        record(fieldBusy, fieldKey(freeField.venueId, freeField.fieldNumber), startMs, endMs);
        assignments.push({
          gameId: game.id,
          venueId: freeField.venueId,
          fieldNumber: freeField.fieldNumber,
          startTime: new Date(candidate),
        });
        latestEnd = Math.max(latestEnd, endMs);
      }
    }

    cursor = new Date(latestEnd);
  }

  return {
    assignments,
    noVenues: false,
    overflowCount,
    scheduledCount: assignments.length,
    keptCount,
  };
}
