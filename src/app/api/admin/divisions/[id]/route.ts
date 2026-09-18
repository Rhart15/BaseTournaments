import { NextRequest, NextResponse } from "next/server";
import { guardDivision } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardDivision(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const {
    label,
    teamCap,
    divisionOptionId,
    subdivisionOptionId,
    publicLabelOverride,
    priceDollars,
    gameTimeLimitMinutes,
    breakMinutes,
    format,
    colorTag,
    waitlistEnabled,
    ghostTeamsCount,
    leagueGamesCount,
    maxRD,
    genderFilter,
    specialPriceDollars,
    specialPriceCutoffDate,
    addressOverride,
    postalCodeOverride,
  } = body;

  const toIntOrNull = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));
  const toCentsOrNull = (v: unknown) =>
    v === null || v === "" || v === undefined ? null : Math.round(Number(v) * 100);

  // BRACKET/BOTH map onto the pool-play engine flag that actually drives
  // bracket generation; POOL_PLAY still runs pool play (usePoolPlay=true)
  // but has no bracket-generation support -- see the DivisionFormat comment
  // in schema.prisma.
  const usePoolPlay =
    format === "BRACKET" ? false : format === "POOL_PLAY" || format === "BOTH" ? true : undefined;

  const division = await prisma.division.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(teamCap !== undefined && { teamCap: toIntOrNull(teamCap) }),
      ...(divisionOptionId !== undefined && { divisionOptionId: divisionOptionId || null }),
      ...(subdivisionOptionId !== undefined && {
        subdivisionOptionId: subdivisionOptionId || null,
      }),
      ...(publicLabelOverride !== undefined && {
        publicLabelOverride: publicLabelOverride || null,
      }),
      ...(priceDollars !== undefined && { priceCents: toCentsOrNull(priceDollars) }),
      ...(gameTimeLimitMinutes !== undefined && {
        gameTimeLimitMinutes: toIntOrNull(gameTimeLimitMinutes),
      }),
      ...(breakMinutes !== undefined && { breakMinutes: toIntOrNull(breakMinutes) }),
      ...(format !== undefined && { format, ...(usePoolPlay !== undefined && { usePoolPlay }) }),
      ...(colorTag !== undefined && { colorTag: colorTag || null }),
      ...(waitlistEnabled !== undefined && { waitlistEnabled: Boolean(waitlistEnabled) }),
      ...(ghostTeamsCount !== undefined && { ghostTeamsCount: Number(ghostTeamsCount) || 0 }),
      ...(leagueGamesCount !== undefined && { leagueGamesCount: toIntOrNull(leagueGamesCount) }),
      ...(maxRD !== undefined && { maxRD: toIntOrNull(maxRD) }),
      ...(genderFilter !== undefined && { genderFilter: genderFilter || null }),
      ...(specialPriceDollars !== undefined && {
        specialPriceCents: toCentsOrNull(specialPriceDollars),
      }),
      ...(specialPriceCutoffDate !== undefined && {
        specialPriceCutoffDate: specialPriceCutoffDate ? new Date(specialPriceCutoffDate) : null,
      }),
      ...(addressOverride !== undefined && { addressOverride: addressOverride || null }),
      ...(postalCodeOverride !== undefined && {
        postalCodeOverride: postalCodeOverride || null,
      }),
      ...visibilityFields(body),
    },
  });

  return NextResponse.json({ division });
}

const VISIBILITY_KEYS = [
  "showRegistration",
  "showTeamsAttending",
  "showWaitlist",
  "showPoolStandings",
  "showDivisionStandings",
  "showOverallStandings",
  "showSchedule",
  "showResults",
] as const;

function visibilityFields(body: Record<string, unknown>) {
  const data: Record<string, boolean> = {};
  for (const key of VISIBILITY_KEYS) {
    if (body[key] !== undefined) data[key] = Boolean(body[key]);
  }
  return data;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardDivision(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  await prisma.division.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
