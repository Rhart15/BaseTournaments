import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileAdminSession } from "@/lib/mobileAuth";
import { guardAdmin, isLeadAdmin, tournamentScopeWhere } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Admin tournament list -- the mobile equivalent of /admin. A lead
// admin sees every tournament; a regular admin sees only the ones they
// own (tournamentScopeWhere, same helper the website dashboard uses).
export async function GET(req: NextRequest) {
  const mobileSession = await getMobileAdminSession(req);
  const g = await guardAdmin(mobileSession);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const tournaments = await prisma.tournament.findMany({
    where: tournamentScopeWhere(g.session),
    orderBy: { startDate: "asc" },
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
      registrations: { select: { status: true } },
    },
  });

  const shaped = tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    sport: t.sport,
    startDate: t.startDate,
    endDate: t.endDate,
    city: t.city,
    state: t.state,
    entryFeeCents: t.entryFeeCents,
    teamCap: t.teamCap,
    registrationCount: t.registrations.filter((r) => ["PAID", "PENDING"].includes(r.status))
      .length,
    owner: t.owner,
  }));

  return NextResponse.json({ tournaments: shaped, isLeadAdmin: isLeadAdmin(g.session) });
}
