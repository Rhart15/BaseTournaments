import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Wipes a division's entire bracket (winners, losers, Grand Final -- all
// of it) and unpublishes it, so a fresh bracket can be generated from
// scratch. Pool play games and standings are left untouched. Useful
// after a setup mistake, or after a bracket has been corrupted (e.g. by
// deleting teams that were still referenced by scored bracket games).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: divisionId } = await params;

  const deleted = await prisma.game.deleteMany({
    where: { divisionId, stage: "BRACKET" },
  });

  await prisma.division.update({
    where: { id: divisionId },
    data: { bracketPublished: false, resultsFinalized: false },
  });

  await prisma.registration.updateMany({
    where: { divisionId },
    data: { finalPlacement: null, bracketWins: 0, bracketLosses: 0 },
  });

  return NextResponse.json({ ok: true, gamesDeleted: deleted.count });
}
