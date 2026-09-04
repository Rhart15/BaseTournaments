import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Lets the admin configure how a division's bracket will be generated
// -- whether pool play happens first, and which game-guarantee format
// to label it as -- before hitting "Generate bracket". Locked once a
// bracket already exists for the division.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: divisionId } = await params;
  const body = await req.json();

  const usePoolPlay = Boolean(body.usePoolPlay);
  const gameGuarantee = Number(body.gameGuarantee);
  if (gameGuarantee !== 3 && gameGuarantee !== 4) {
    return NextResponse.json(
      { error: "Game guarantee must be 3 or 4" },
      { status: 400 }
    );
  }

  const existingBracketGames = await prisma.game.count({
    where: { divisionId, stage: "BRACKET" },
  });
  if (existingBracketGames > 0) {
    return NextResponse.json(
      { error: "Bracket format is locked once a bracket has been generated" },
      { status: 409 }
    );
  }

  const division = await prisma.division.update({
    where: { id: divisionId },
    data: { usePoolPlay, gameGuarantee },
  });

  return NextResponse.json({ division });
}
