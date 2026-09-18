import { NextRequest, NextResponse } from "next/server";
import { guardTournament } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Persists drag-to-reorder from the Divisions tab. Body: { order: string[] }
// -- division ids in their new display order.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { order } = await req.json();
  if (!Array.isArray(order) || order.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "order must be an array of division ids." }, { status: 400 });
  }

  const owned = await prisma.division.findMany({
    where: { tournamentId: id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((d) => d.id));
  if (!order.every((divId) => ownedIds.has(divId))) {
    return NextResponse.json(
      { error: "One or more divisions don't belong to this event." },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map((divId, index) =>
      prisma.division.update({ where: { id: divId }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
