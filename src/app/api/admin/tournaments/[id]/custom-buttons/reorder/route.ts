import { NextRequest, NextResponse } from "next/server";
import { guardTournament } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Persists drag-to-reorder for the Schedule tab's custom-buttons list.
// Body: { order: string[] } -- button ids in their new display order.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { order } = await req.json();
  if (!Array.isArray(order) || order.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "order must be an array of button ids." }, { status: 400 });
  }

  const owned = await prisma.eventCustomButton.findMany({
    where: { tournamentId: id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((b) => b.id));
  if (!order.every((btnId) => ownedIds.has(btnId))) {
    return NextResponse.json(
      { error: "One or more buttons don't belong to this event." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map((btnId, index) =>
      prisma.eventCustomButton.update({ where: { id: btnId }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
