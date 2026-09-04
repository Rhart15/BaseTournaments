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
    insuranceStatus,
    insuranceProvider,
    name,
    ageGroup,
    organization,
    homeCity,
    homeState,
    directorId,
  } = body;

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(insuranceStatus !== undefined && { insuranceStatus }),
      ...(insuranceProvider !== undefined && { insuranceProvider }),
      ...(name !== undefined && { name }),
      ...(ageGroup !== undefined && { ageGroup }),
      ...(organization !== undefined && { organization: organization || null }),
      ...(homeCity !== undefined && { homeCity: homeCity || null }),
      ...(homeState !== undefined && { homeState }),
      ...(directorId !== undefined && { directorId: directorId || null }),
    },
  });

  return NextResponse.json({ team });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Staff and documents cascade automatically. Players don't, and
    // registrations (real tournament entries with payment history)
    // should never be deleted -- just unlinked from the removed team.
    await prisma.player.deleteMany({ where: { teamId: id } });
    await prisma.registration.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't delete this team" },
      { status: 400 }
    );
  }
}
