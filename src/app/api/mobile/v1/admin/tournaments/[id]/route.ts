import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileAdminSession } from "@/lib/mobileAuth";
import { guardTournament } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Admin tournament detail -- the mobile equivalent of
// /admin/tournaments/[id]. Scoped to the owning admin (or a lead admin)
// by guardTournament, the same guard the website route uses.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mobileSession = await getMobileAdminSession(req);
  const g = await guardTournament(id, mobileSession);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sport: true,
      startDate: true,
      endDate: true,
      city: true,
      state: true,
      entryFeeCents: true,
      teamCap: true,
      owner: { select: { id: true, name: true, stripeConnectChargesEnabled: true } },
      divisions: {
        select: {
          id: true,
          label: true,
          ageLimit: true,
          teamCap: true,
          usePoolPlay: true,
          gameGuarantee: true,
          resultsFinalized: true,
          bracketPublished: true,
          registrations: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  return NextResponse.json({
    tournament: {
      ...tournament,
      divisions: tournament.divisions.map((d) => ({
        id: d.id,
        label: d.label,
        ageLimit: d.ageLimit,
        teamCap: d.teamCap,
        usePoolPlay: d.usePoolPlay,
        gameGuarantee: d.gameGuarantee,
        resultsFinalized: d.resultsFinalized,
        bracketPublished: d.bracketPublished,
        registrationCount: d.registrations.filter((r) => ["PAID", "PENDING"].includes(r.status))
          .length,
      })),
    },
  });
}
