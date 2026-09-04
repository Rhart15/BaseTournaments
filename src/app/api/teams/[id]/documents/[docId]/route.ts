import { NextRequest, NextResponse } from "next/server";
import { canManageTeam } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = await prisma.teamDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.teamId !== id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  await prisma.teamDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
