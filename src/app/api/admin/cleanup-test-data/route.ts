import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// One-click cleanup for everything created while testing the bracket
// system: any Division whose label contains "test", plus any standalone
// Team or Registration whose name looks like test data (created via the
// admin test-teams endpoint, which always prefixes names with "Test ").
// Deletes in dependency order since none of these relations cascade.
export async function POST() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const testDivisions: { id: string; label: string }[] = await prisma.division.findMany({
    where: { label: { contains: "test", mode: "insensitive" } },
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

  // Any leftover registrations with a "Test " team name outside a test
  // division (shouldn't normally happen, but cleans up stragglers).
  const strayRegs = await prisma.registration.deleteMany({
    where: { teamName: { startsWith: "Test ", mode: "insensitive" } },
  });
  registrationsDeleted += strayRegs.count;

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
