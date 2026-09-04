import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Registration } from "@prisma/client";
import { seedFromPoolStandings, propagateByeAdvancement } from "@/lib/brackets";

// Takes the seeded field for a division and creates the single-elimination
// bracket Game rows, wiring each round's winner slot to feed into the next
// round automatically.
//
// If the team count isn't a power of two, the weakest teams play a
// "Play-In" round first so the main bracket itself never has more than
// one round of true byes -- see standardSeedOrder/buildPlayInPlan below.
// (Full double-elimination / game-guarantee backside bracket is not
// built yet -- gameGuarantee is currently a label only.)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: divisionId } = await params;

  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: { registrations: true },
  });

  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  const existingBracketGames = await prisma.game.count({
    where: { divisionId, stage: "BRACKET" },
  });
  if (existingBracketGames > 0) {
    return NextResponse.json(
      { error: "A bracket already exists for this division" },
      { status: 409 }
    );
  }

  const activeRegistrations = division.registrations.filter(
    (r: Registration) => r.status !== "CANCELLED" && r.status !== "REFUNDED"
  );

  // Pool play (if used) ranks teams by record; otherwise seed by
  // registration order, which the admin can fix up afterward with the
  // drag-and-drop bracket editor.
  const seededTeamIds = division.usePoolPlay
    ? seedFromPoolStandings(activeRegistrations)
    : [...activeRegistrations]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((r) => r.id);

  const teamCount = seededTeamIds.length;
  if (teamCount < 2) {
    return NextResponse.json(
      { error: "Need at least 2 teams to generate a bracket" },
      { status: 400 }
    );
  }

  const { bracketSize, directTeamIds, playInPairs, seeds } =
    buildPlayInPlan(seededTeamIds);

  const pairOrder = standardSeedOrder(bracketSize);
  const round1Pairs: [string | null, string | null][] = [];
  // Tracks, for each play-in pair, which round1 pair-index it feeds --
  // so once round1 games are created we know which game's advancesToGameId
  // to point the play-in game at.
  const placeholderRankToPairIndex = new Map<number, number>();

  for (let i = 0; i < pairOrder.length; i += 2) {
    const seedA = pairOrder[i];
    const seedB = pairOrder[i + 1];
    const teamA = seeds[seedA - 1];
    const teamB = seeds[seedB - 1];
    const pairIndex = round1Pairs.length;
    if (teamA === null) {
      placeholderRankToPairIndex.set(seedA - directTeamIds.length, pairIndex);
    }
    if (teamB === null) {
      placeholderRankToPairIndex.set(seedB - directTeamIds.length, pairIndex);
    }
    round1Pairs.push([teamA, teamB]);
  }

  // Create round 1 (main bracket) games. A slot with a null side only
  // gets treated as a true bye (auto-final) if nothing is ever coming --
  // if it's a placeholder waiting on a Play-In winner, it must stay
  // SCHEDULED instead of getting auto-finalized as a fake bye.
  const pendingPairIndexes = new Set(placeholderRankToPairIndex.values());
  let currentRoundGameIds: string[] = [];
  for (let pairIndex = 0; pairIndex < round1Pairs.length; pairIndex++) {
    const [homeId, awayId] = round1Pairs[pairIndex];
    const bothEmpty = !homeId && !awayId;
    const isPending = pendingPairIndexes.has(pairIndex);
    const isTrueBye = !isPending && !bothEmpty && (!homeId || !awayId);
    const game = await prisma.game.create({
      data: {
        divisionId,
        stage: "BRACKET",
        round: "Round 1",
        homeTeamId: homeId,
        awayTeamId: awayId,
        status: isTrueBye ? "FINAL" : "SCHEDULED",
        homeScore: isTrueBye && homeId ? 1 : null,
        awayScore: isTrueBye && awayId ? 1 : null,
      },
    });
    currentRoundGameIds.push(game.id);
  }

  // Now create the play-in games, pointing each one at the round 1 game
  // it feeds (the exact home/away slot is picked automatically by the
  // score-entry route once the play-in game is scored).
  for (let k = 0; k < playInPairs.length; k++) {
    const rank = k + 1;
    const pairIndex = placeholderRankToPairIndex.get(rank);
    const targetGameId =
      pairIndex !== undefined ? currentRoundGameIds[pairIndex] : null;
    const [homeId, awayId] = playInPairs[k];
    await prisma.game.create({
      data: {
        divisionId,
        stage: "BRACKET",
        round: "Play-In",
        homeTeamId: homeId,
        awayTeamId: awayId,
        status: "SCHEDULED",
        advancesToGameId: targetGameId,
      },
    });
  }

  let roundNumber = 2;
  const wbRoundsGames: string[][] = [currentRoundGameIds];
  while (currentRoundGameIds.length > 1) {
    const nextRoundGameIds: string[] = [];
    const roundLabel =
      currentRoundGameIds.length === 2
        ? "Championship"
        : currentRoundGameIds.length === 4
        ? "Semifinals"
        : `Round ${roundNumber}`;

    for (let i = 0; i < currentRoundGameIds.length; i += 2) {
      const game = await prisma.game.create({
        data: {
          divisionId,
          stage: "BRACKET",
          round: roundLabel,
          status: "SCHEDULED",
        },
      });
      nextRoundGameIds.push(game.id);

      await prisma.game.update({
        where: { id: currentRoundGameIds[i] },
        data: { advancesToGameId: game.id },
      });
      await prisma.game.update({
        where: { id: currentRoundGameIds[i + 1] },
        data: { advancesToGameId: game.id },
      });
    }
    currentRoundGameIds = nextRoundGameIds;
    wbRoundsGames.push(currentRoundGameIds);
    roundNumber++;
  }
  const championshipGameId = currentRoundGameIds[0];

  // Build the losers bracket (double elimination) so a Round-1 loss
  // doesn't end a team's tournament -- they get a second life on the
  // backside, matching the game-guarantee format. Fields with fewer
  // than 4 teams (after Play-In) stay single elimination since there's
  // no meaningful losers bracket to build.
  const lbFinalGameId = await buildLosersBracket(prisma, divisionId, wbRoundsGames);

  if (lbFinalGameId) {
    const grandFinal = await prisma.game.create({
      data: { divisionId, stage: "BRACKET", round: "Grand Final", status: "SCHEDULED" },
    });
    await prisma.game.update({
      where: { id: championshipGameId },
      data: { advancesToGameId: grandFinal.id },
    });
    await prisma.game.update({
      where: { id: lbFinalGameId },
      data: { advancesToGameId: grandFinal.id },
    });
  }

  // Any genuine byes (fallback case above) are marked FINAL immediately
  // but never go through the score-entry route, so nothing has pushed
  // that "winner" forward yet -- do that now (and let it cascade through
  // any rounds where both feeders were byes).
  await propagateByeAdvancement(prisma, divisionId);

  const totalGames = await prisma.game.count({ where: { divisionId, stage: "BRACKET" } });

  return NextResponse.json({ ok: true, gamesCreated: totalGames });
}

/** Standard bracket seeding order so 1 plays the weakest possible seed
 * each round (1v16, 2v15, ... for a 16 bracket, recursively derived). */
function standardSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const next: number[] = [];
    const total = order.length * 2 + 1;
    for (const seed of order) {
      next.push(seed, total - seed);
    }
    order = next;
  }
  return order;
}

function largestPowerOfTwoAtMost(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

/**
 * Builds the losers bracket (double elimination) from the winners
 * bracket's per-round game lists, wiring loserAdvancesToGameId on each
 * WB game so the score-entry route can push a losing team into the
 * right LB slot. Returns the id of the final LB game (whose winner
 * advances to the Grand Final), or null if the field is too small
 * (fewer than 4 teams) for a losers bracket to make sense.
 *
 * Standard double-elimination shape: LB round 1 pairs up WB round 1's
 * losers; every "major" round after that pairs the previous LB round's
 * winners against the next WB round's losers; every "minor" round in
 * between just pairs the previous LB round's winners against each
 * other. This is a simple, deterministic seeding (not a fully
 * rematch-optimized reseed), which is a normal simplification for a
 * bracket this size -- and there's no "bracket reset" grand final; a
 * single Grand Final game decides it.
 */
async function buildLosersBracket(
  prisma: import("@prisma/client").PrismaClient,
  divisionId: string,
  wbRoundsGames: string[][]
): Promise<string | null> {
  const wbRound1 = wbRoundsGames[0];
  if (wbRound1.length < 2) return null; // fewer than 4 teams total

  // LB round 1: pair up WB round 1's losers.
  let currentLBGameIds: string[] = [];
  for (let j = 0; j < wbRound1.length; j += 2) {
    const game = await prisma.game.create({
      data: { divisionId, stage: "BRACKET", round: "Losers Round 1", status: "SCHEDULED" },
    });
    currentLBGameIds.push(game.id);
    await prisma.game.update({
      where: { id: wbRound1[j] },
      data: { loserAdvancesToGameId: game.id },
    });
    await prisma.game.update({
      where: { id: wbRound1[j + 1] },
      data: { loserAdvancesToGameId: game.id },
    });
  }

  let lbRoundNumber = 2;
  let wbConsumeIndex = 1; // next WB round (index into wbRoundsGames) whose losers join the LB

  while (currentLBGameIds.length > 1 || wbConsumeIndex < wbRoundsGames.length) {
    // Major round: previous LB winners vs the next WB round's losers.
    const wbLosersRound = wbRoundsGames[wbConsumeIndex];
    const nextGameIds: string[] = [];
    for (let j = 0; j < currentLBGameIds.length; j++) {
      const game = await prisma.game.create({
        data: {
          divisionId,
          stage: "BRACKET",
          round: `Losers Round ${lbRoundNumber}`,
          status: "SCHEDULED",
        },
      });
      nextGameIds.push(game.id);
      await prisma.game.update({
        where: { id: currentLBGameIds[j] },
        data: { advancesToGameId: game.id },
      });
      await prisma.game.update({
        where: { id: wbLosersRound[j] },
        data: { loserAdvancesToGameId: game.id },
      });
    }
    currentLBGameIds = nextGameIds;
    wbConsumeIndex++;
    lbRoundNumber++;

    if (wbConsumeIndex >= wbRoundsGames.length) break; // just consumed the championship's loser

    // Minor round: previous (major) round's winners pair against each other.
    if (currentLBGameIds.length > 1) {
      const minorNextIds: string[] = [];
      for (let j = 0; j < currentLBGameIds.length; j += 2) {
        const game = await prisma.game.create({
          data: {
            divisionId,
            stage: "BRACKET",
            round: `Losers Round ${lbRoundNumber}`,
            status: "SCHEDULED",
          },
        });
        minorNextIds.push(game.id);
        await prisma.game.update({
          where: { id: currentLBGameIds[j] },
          data: { advancesToGameId: game.id },
        });
        await prisma.game.update({
          where: { id: currentLBGameIds[j + 1] },
          data: { advancesToGameId: game.id },
        });
      }
      currentLBGameIds = minorNextIds;
      lbRoundNumber++;
    }
  }

  return currentLBGameIds[0];
}

/**
 * When the field isn't a clean power of two, padding the main bracket up
 * to the next power of two (the old approach) creates a wall of bye
 * games in round 1 -- e.g. 9 teams needs a 16-slot bracket, so 7 of the
 * 8 round-1 games are just "vs BYE".
 *
 * Instead, trim the field down to the largest power of two at or below
 * the team count by having the weakest teams play a "Play-In" round
 * first. Their winners fill the remaining bracket slots, so the main
 * bracket itself has zero byes (aside from the fallback case where
 * teamCount is already below any valid pairing).
 */
function buildPlayInPlan(seededTeamIds: string[]) {
  const n = seededTeamIds.length;
  const bracketSize = largestPowerOfTwoAtMost(n);
  const playInCount = n - bracketSize;
  const directCount = n - 2 * playInCount;

  const directTeamIds = seededTeamIds.slice(0, directCount);
  const playInTeamIds = seededTeamIds.slice(directCount);

  const playInPairs: [string, string][] = [];
  for (let k = 0; k < playInCount; k++) {
    playInPairs.push([playInTeamIds[2 * k], playInTeamIds[2 * k + 1]]);
  }

  // seeds[0..directCount-1] are real teams; the remaining slots up to
  // bracketSize are placeholders (null) that the play-in winners fill.
  const seeds: (string | null)[] = [...directTeamIds];
  while (seeds.length < bracketSize) seeds.push(null);

  return { bracketSize, directTeamIds, playInPairs, seeds };
}
