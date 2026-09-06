import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { active } = body;

  const code = await prisma.discountCode.update({
    where: { id },
    data: { ...(active !== undefined && { active }) },
  });
  return NextResponse.json({ code });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  // Registrations that already used this code keep their
  // discountAmountCents on record; only the code relation is cleared.
  await prisma.registration.updateMany({
    where: { discountCodeId: id },
    data: { discountCodeId: null },
  });
  await prisma.discountCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
