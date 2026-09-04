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
  const {
    backgroundCheckStatus,
    sanctionFeePaid,
    name,
    email,
    region,
    phone,
    bio,
  } = body;

  try {
    const director = await prisma.director.update({
      where: { id },
      data: {
        ...(backgroundCheckStatus !== undefined && { backgroundCheckStatus }),
        ...(sanctionFeePaid !== undefined && { sanctionFeePaid }),
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(region !== undefined && { region }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(bio !== undefined && { bio: bio || null }),
      },
    });
    return NextResponse.json({ director });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save -- that email may already be in use" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Unassign any teams from this director first rather than blocking the
  // delete -- a removed director shouldn't take their teams down with them.
  await prisma.team.updateMany({
    where: { directorId: id },
    data: { directorId: null },
  });

  try {
    await prisma.director.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't delete this director" },
      { status: 400 }
    );
  }
}
