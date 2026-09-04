import { NextResponse } from "next/server";
import { canManageRegistration } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id, playerId } = await params;
  if (!(await canManageRegistration(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const player = await prisma.rosterPlayer.findUnique({
    where: { id: playerId },
  });

  if (!player || player.registrationId !== id) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  await prisma.rosterPlayer.delete({ where: { id: playerId } });

  return NextResponse.json({ ok: true });
}