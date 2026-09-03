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
    name,
    sport,
    startDate,
    endDate,
    city,
    state,
    entryFeeDollars,
    teamCap,
    description,
  } = body;

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sport !== undefined && { sport }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(entryFeeDollars !== undefined && {
        entryFeeCents: Math.round(Number(entryFeeDollars) * 100),
      }),
      ...(teamCap !== undefined && { teamCap: Number(teamCap) }),
      ...(description !== undefined && { description: description || null }),
    },
  });

  return NextResponse.json({ tournament });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.tournament.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
