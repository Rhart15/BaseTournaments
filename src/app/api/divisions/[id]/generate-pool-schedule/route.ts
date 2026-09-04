import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const POOL_LABELS = "ABCDEFGHIJ".split("");

// Takes every team registered for a division and builds the pool-play
// schedule from scratch: splits them into N pools, then round-robins
// each pool (every team in a pool plays every other team once). This is
// the missing first step the bracket generator needs -- it can't seed a
// bracket until pool games exist and are scored.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: divisionId } = await params;
  const body = await req.json().catch(() => ({}));
  const poolCount = Math.max(1, Math.min(10, Number(body.poolCount) || 1));

  const existingPoolGames = await prisma.game.count({
    where: { divisionId, stage: "POOL" },
  });
  if (existingPoolGames > 0) {
    return NextResponse.json(
      { error: "A pool schedule already exists for this division." },
      { status: 409 }
    );
  }

  const registrations = await prisma.registration.findMany({
    where: {
      divisionId,
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (registrations.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 registered teams to build a schedule." },
      { status: 400 }
    );
  }

  // Split teams evenly across the requested number of pools.
  const pools: (typeof registrations)[] = Array.from(
    { length: poolCount },
    () => []
  );
  registrations.forEach((reg, i) => pools[i % poolCount].push(reg));

  let gamesCreated = 0;

  for (let p = 0; p < pools.length; p++) {
    const teams = pools[p];
    if (teams.length < 2) continue; // not enough teams for this pool, skip

    const pool = await prisma.pool.create({
      data: { divisionId, label: `Pool ${POOL_LABELS[p] ?? p + 1}` },
    });

    await prisma.registration.updateMany({
      where: { id: { in: teams.map((t) => t.id) } },
      data: { poolId: pool.id },
    });

    // Standard round-robin (circle method): every team plays every
    // other team in the pool exactly once.
    const ids = teams.map((t) => t.id);
    if (ids.length % 2 !== 0) ids.push(""); // bye slot for odd team counts
    const n = ids.length;
    const rounds = n - 1;

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < n / 2; i++) {
        const home = ids[i];
        const away = ids[n - 1 - i];
        if (!home || !away) continue; // bye this round
        await prisma.game.create({
          data: {
            divisionId,
            poolId: pool.id,
            stage: "POOL",
            round: `Pool Round ${round + 1}`,
            homeTeamId: home,
            awayTeamId: away,
            status: "SCHEDULED",
          },
        });
        gamesCreated++;
      }
      // rotate all but the first id
      const fixed = ids[0];
      const rest = ids.slice(1);
      rest.unshift(rest.pop() as string);
      ids.splice(0, ids.length, fixed, ...rest);
    }
  }

  return NextResponse.json({ ok: true, poolsCreated: poolCount, gamesCreated });
}
