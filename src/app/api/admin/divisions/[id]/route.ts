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
  const { label, teamCap } = body;

  const division = await prisma.division.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(teamCap !== undefined && {
        teamCap: teamCap === null || teamCap === "" ? null : Number(teamCap),
      }),
    },
  });

  return NextResponse.json({ division });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.division.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
