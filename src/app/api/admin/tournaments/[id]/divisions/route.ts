import { NextRequest, NextResponse } from "next/server";
import { guardTournament } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const body = await req.json();
  const { label, teamCap, divisionOptionId, subdivisionOptionId } = body;

  let resolvedLabel = label?.trim();
  if (!resolvedLabel && divisionOptionId) {
    const option = await prisma.divisionOption.findUnique({ where: { id: divisionOptionId } });
    resolvedLabel = option?.label;
  }

  if (!resolvedLabel) {
    return NextResponse.json(
      { error: "Division label is required." },
      { status: 400 }
    );
  }

  const maxSortOrder = await prisma.division.aggregate({
    where: { tournamentId: id },
    _max: { sortOrder: true },
  });

  const division = await prisma.division.create({
    data: {
      tournamentId: id,
      label: resolvedLabel,
      teamCap: teamCap ? Number(teamCap) : null,
      divisionOptionId: divisionOptionId || null,
      subdivisionOptionId: subdivisionOptionId || null,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ division });
}
