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

  const { text, url } = await req.json();
  if (!text?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "Button text and URL are required." }, { status: 400 });
  }

  const maxSortOrder = await prisma.eventCustomButton.aggregate({
    where: { tournamentId: id },
    _max: { sortOrder: true },
  });

  const button = await prisma.eventCustomButton.create({
    data: {
      tournamentId: id,
      text: text.trim(),
      url: url.trim(),
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ button });
}
