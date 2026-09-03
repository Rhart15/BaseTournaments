import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { staffId } = await params;
  await prisma.teamStaff.delete({ where: { id: staffId } });
  return NextResponse.json({ ok: true });
}
