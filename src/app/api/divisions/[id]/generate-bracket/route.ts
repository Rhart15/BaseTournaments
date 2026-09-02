import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedFromPoolStandings } from "@/lib/brackets";

// Takes final pool-play standings for a division and creates the
// single-elimination bracket Game rows, wiring each round's winner slot
// to feed into the next round automatically.
//
// NOTE: builds single elimination only for now. Double elimination needs
// a losers-bracket slot map -- see README "Not built yet".
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

  const seededTeamIds = seedFromPoolStandings(division.registrations);
  const teamCount = seededTeamIds.length;

  if (teamCount < 2) {
    return NextResponse.json(
      { error: "Need at least 2 teams to generate a bracket" },
      { status: 400 }
    );
  }

  // Standard seeded bracket pairing (1 vs last, 2 vs second-last, etc.),
  // padded with byes up to the next power of two.
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const seeds: (string | null)[] = [...seededTeamIds];
  while (seeds.length < bracketSize) seeds.push(null); // bye

  const pairOrder = standardSeedOrder(bracketSize);
  const round1Pairs: [string | null, string | null][] = [];
  for (let i = 0; i < pairOrder.length; i += 2) {
    round1Pairs.push([seeds[pairOrder[i] - 1], seeds[pairOrder[i + 1] - 1]]);
  }

  // Create games round by round so later rounds can reference earlier
  // rounds' IDs for advancement.
  let currentRoundGameIds: string[] = [];
  for (const [homeId, awayId] of round1Pairs) {
    const game = await prisma.game.create({
      data: {
        divisionId,
        stage: "BRACKET",
        round: "Round 1",
        homeTeamId: homeId,
        awayTeamId: awayId,
        // a bye auto-advances -- mark it final immediately with the
        // present team as the "winner" via score placeholders
        status: homeId && awayId ? "SCHEDULED" : "FINAL",
        homeScore: homeId && !awayId ? 1 : null,
        awayScore: awayId && !homeId ? 1 : null,
      },
    });
    currentRoundGameIds.push(game.id);
  }

  let roundNumber = 2;
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
    roundNumber++;
  }

  return NextResponse.json({ ok: true, gamesCreated: bracketSize - 1 });
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
