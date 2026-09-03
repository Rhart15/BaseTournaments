import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: "The main admin can't be removed." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "COACH" },
  });

  return NextResponse.json({ ok: true });
}
