import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;
  await prisma.teamDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
