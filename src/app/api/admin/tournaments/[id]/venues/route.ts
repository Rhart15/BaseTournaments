import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardTournament } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

const venuesSchema = z.object({
  venueIds: z.array(z.string()),
});

// Replaces the full set of venues this tournament's schedule can use.
// Separate from the legacy single Tournament.venueId (still drives the
// public map/address display) -- see TournamentVenue in schema.prisma.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  const g = await guardTournament(tournamentId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const parsed = venuesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid venue list" }, { status: 400 });
  }
  const venueIds = [...new Set(parsed.data.venueIds)];

  if (venueIds.length > 0) {
    const validCount = await prisma.venue.count({ where: { id: { in: venueIds } } });
    if (validCount !== venueIds.length) {
      return NextResponse.json({ error: "One of the selected venues doesn't exist." }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.tournamentVenue.deleteMany({ where: { tournamentId } }),
    ...(venueIds.length > 0
      ? [
          prisma.tournamentVenue.createMany({
            data: venueIds.map((venueId) => ({ tournamentId, venueId })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true, venueIds });
}
