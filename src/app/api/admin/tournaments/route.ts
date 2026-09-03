import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  } = body;

  if (!name || !sport || !startDate || !endDate || !city || !teamCap) {
    return NextResponse.json(
      { error: "Name, sport, dates, city, and team cap are required." },
      { status: 400 }
    );
  }

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
