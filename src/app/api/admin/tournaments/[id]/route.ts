import { NextRequest, NextResponse } from "next/server";
import { guardTournament, isLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

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
    ownerId,
  } = body;

  // Reassigning the organizer is a lead-admin-only action.
  if (ownerId !== undefined) {
    if (!isLeadAdmin(g.session)) {
      return NextResponse.json(
        { error: "Only a lead admin can change a tournament's organizer." },
        { status: 403 }
      );
    }
    const target = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!target || target.role !== "ADMIN") {
      return NextResponse.json(
        { error: "The chosen organizer isn't an admin account." },
        { status: 400 }
      );
    }
  }

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
      ...(ownerId !== undefined && { ownerId }),
    },
  });

  return NextResponse.json({ tournament });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  await prisma.tournament.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
