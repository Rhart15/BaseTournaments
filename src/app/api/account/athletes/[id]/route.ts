import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const athlete = await prisma.familyAthlete.findUnique({ where: { id } });
  if (!athlete || athlete.parentId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.familyAthlete.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
