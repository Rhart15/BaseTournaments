import { NextRequest, NextResponse } from "next/server";
import { guardAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { id } = await params;
  const body = await req.json();
  const { name, address, city, state, fieldCount } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!String(name).trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    data.name = String(name).trim();
  }
  if (address !== undefined) {
    if (!String(address).trim()) return NextResponse.json({ error: "Address is required." }, { status: 400 });
    data.address = String(address).trim();
  }
  if (city !== undefined) {
    if (!String(city).trim()) return NextResponse.json({ error: "City is required." }, { status: 400 });
    data.city = String(city).trim();
  }
  if (state !== undefined) data.state = String(state).trim() || "AR";
  if (fieldCount !== undefined) {
    const fields = Number(fieldCount);
    if (!Number.isFinite(fields) || fields < 1) {
      return NextResponse.json({ error: "Field count must be at least 1." }, { status: 400 });
    }
    data.fieldCount = Math.round(fields);
  }

  const venue = await prisma.venue.update({ where: { id }, data });

  // Lowering fieldCount doesn't touch existing games -- the schedule
  // generator always rebuilds its field list from the venue's CURRENT
  // fieldCount, so it will never place a new game on a field number that
  // no longer exists (no double-booking risk either way). Just let the
  // admin know if that leaves stale games sitting on now-nonexistent
  // fields, rather than staying silent about it.
  let warning: string | null = null;
  if (fieldCount !== undefined) {
    const orphanedCount = await prisma.game.count({
      where: { venueId: id, fieldNumber: { gt: venue.fieldCount } },
    });
    if (orphanedCount > 0) {
      warning = `${orphanedCount} existing game${orphanedCount === 1 ? "" : "s"} at this venue ${
        orphanedCount === 1 ? "is" : "are"
      } scheduled on a field number beyond the new count. They're left as-is -- Generate/Regenerate schedule will just stop using those fields going forward.`;
    }
  }

  return NextResponse.json({ venue, warning });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { id } = await params;

  const [legacyTournamentCount, tournamentVenueCount, gameCount] = await Promise.all([
    prisma.tournament.count({ where: { venueId: id } }),
    prisma.tournamentVenue.count({ where: { venueId: id } }),
    prisma.game.count({ where: { venueId: id } }),
  ]);

  if (legacyTournamentCount > 0 || tournamentVenueCount > 0 || gameCount > 0) {
    const parts: string[] = [];
    if (legacyTournamentCount + tournamentVenueCount > 0) {
      const n = legacyTournamentCount + tournamentVenueCount;
      parts.push(`attached to ${n} tournament${n === 1 ? "" : "s"}`);
    }
    if (gameCount > 0) {
      parts.push(`has ${gameCount} scheduled game${gameCount === 1 ? "" : "s"}`);
    }
    return NextResponse.json(
      {
        error: `Can't delete this venue -- it's ${parts.join(" and ")}. Detach it from those tournaments' Schedule step and reassign those games first.`,
      },
      { status: 409 }
    );
  }

  await prisma.venue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
