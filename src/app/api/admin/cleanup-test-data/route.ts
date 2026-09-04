import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// One-click cleanup for everything created while testing the bracket
// system. A division is treated as test data if its label contains any
// of a few known testing-only naming patterns -- real youth divisions
// are never named things like "10U-DblElim" or "PlayIn", so this is
// safe. Deletes each matched division's games, registrations, and pools
// together (in dependency order, since none of these relations
// cascade) so nothing is ever left half-deleted or orphaned.
const TEST_DIVISION_PATTERNS = ["test", "dblelim", "playin"];

export async function POST() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testDivisions: { id: string; label: string }[] = await prisma.division.findMany({
    where: {
      OR: TEST_DIVISION_PATTERNS.map((pattern) => ({
        label: { contains: pattern, mode: "insensitive" as const },
      })),
    },
    select: { id: true, label: true },
  });
  const testDivisionIds = testDivisions.map((d: { id: string }) => d.id);

  let gamesDeleted = 0;
  let registrationsDeleted = 0;
  let poolsDeleted = 0;

  if (testDivisionIds.length > 0) {
    const games = await prisma.game.deleteMany({
      where: { divisionId: { in: testDivisionIds } },
    });
    gamesDeleted += games.count;

    const regs = await prisma.registration.deleteMany({
      where: { divisionId: { in: testDivisionIds } },
    });
    registrationsDeleted += regs.count;

    const pools = await prisma.pool.deleteMany({
      where: { divisionId: { in: testDivisionIds } },
    });
    poolsDeleted += pools.count;

    await prisma.division.deleteMany({
      where: { id: { in: testDivisionIds } },
    });
  }

  // Standalone Team rows created for testing (e.g. "Test Warriors").
  const testTeams: { id: string }[] = await prisma.team.findMany({
    where: { name: { contains: "test", mode: "insensitive" } },
    select: { id: true },
  });
  const testTeamIds = testTeams.map((t: { id: string }) => t.id);

  let teamsDeleted = 0;
  if (testTeamIds.length > 0) {
    await prisma.player.deleteMany({ where: { teamId: { in: testTeamIds } } });
    await prisma.registration.updateMany({
      where: { teamId: { in: testTeamIds } },
      data: { teamId: null },
    });
    const teams = await prisma.team.deleteMany({
      where: { id: { in: testTeamIds } },
    });
    teamsDeleted = teams.count;
  }

  return NextResponse.json({
    ok: true,
    divisionsDeleted: testDivisionIds.length,
    divisionLabels: testDivisions.map((d: { label: string }) => d.label),
    gamesDeleted,
    registrationsDeleted,
    poolsDeleted,
    teamsDeleted,
  });
}
