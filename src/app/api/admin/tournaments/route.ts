import { NextRequest, NextResponse } from "next/server";
import { guardAdmin, isLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { buildEventSlugBase, ensureUniqueSlug, slugify } from "@/lib/eventSlug";

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const { session } = g;

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
    divisionLabels,
    ownerId: requestedOwnerId,
    // --- Event wizard: Details ---
    season,
    eventType,
    entryType,
    status,
    featured,
    dailyStartTime,
    dailyEndTime,
    registrationOpensAt,
    registrationClosesAt,
    registrationStatus,
    address,
    displayLocation,
    slug: requestedSlug,
    showFlyerInsteadOfLogo,
    staffTags,
  } = body;

  if (!name || !sport || !startDate || !endDate || !city || !teamCap) {
    return NextResponse.json(
      { error: "Name, sport, dates, city, and team cap are required." },
      { status: 400 }
    );
  }

  // A new tournament belongs to whoever created it. Only a lead admin may
  // hand it to a different organizer at creation time (e.g. setting one up
  // on another director's behalf).
  let ownerId = session.user.id;
  if (requestedOwnerId && requestedOwnerId !== session.user.id) {
    if (!isLeadAdmin(session)) {
      return NextResponse.json(
        { error: "Only a lead admin can create a tournament for another organizer." },
        { status: 403 }
      );
    }
    const target = await prisma.user.findUnique({ where: { id: requestedOwnerId } });
    if (!target || target.role !== "ADMIN") {
      return NextResponse.json(
        { error: "The chosen organizer isn't an admin account." },
        { status: 400 }
      );
    }
    ownerId = requestedOwnerId;
  }

  const slugBase = requestedSlug
    ? slugify(String(requestedSlug))
    : buildEventSlugBase({ name, city, startDate: new Date(startDate) });
  const slug = await ensureUniqueSlug(prisma, slugBase);

  const tags: string[] = (staffTags || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const tournament = await prisma.tournament.create({
    data: {
      name,
      sport,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      city,
      state: state || "AR",
      entryFeeCents: Math.round(Number(entryFeeDollars || 0) * 100),
      teamCap: Number(teamCap),
      description: description || null,
      ownerId,
      season: season || null,
      ...(eventType !== undefined && { eventType }),
      ...(entryType !== undefined && { entryType }),
      ...(status !== undefined && { status }),
      ...(featured !== undefined && { featured: Boolean(featured) }),
      dailyStartTime: dailyStartTime || null,
      dailyEndTime: dailyEndTime || null,
      registrationOpensAt: registrationOpensAt ? new Date(registrationOpensAt) : null,
      registrationClosesAt: registrationClosesAt ? new Date(registrationClosesAt) : null,
      ...(registrationStatus !== undefined && { registrationStatus }),
      address: address || null,
      displayLocation: displayLocation || null,
      slug,
      showFlyerInsteadOfLogo: Boolean(showFlyerInsteadOfLogo),
      staffTags: tags,
    },
  });

  const labels: string[] = (divisionLabels || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  for (const label of labels) {
    await prisma.division.create({
      data: { tournamentId: tournament.id, label },
    });
  }

  return NextResponse.json({ tournament });
}
