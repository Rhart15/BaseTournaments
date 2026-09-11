import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Sport } from "@prisma/client";

export const dynamic = "force-dynamic";

// Public tournament listing -- the mobile equivalent of /tournaments.
// No auth required, same as the website page. Query params mirror the
// website's filter bar: sport, state, q (name/city search), when=past
// (defaults to upcoming).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");
  const state = searchParams.get("state");
  const q = searchParams.get("q")?.trim();
  const when = searchParams.get("when");

  const tournaments = await prisma.tournament.findMany({
    where: sport === "BASEBALL" || sport === "SOFTBALL" ? { sport: sport as Sport } : undefined,
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      sport: true,
      startDate: true,
      endDate: true,
      city: true,
      state: true,
      flyerUrl: true,
      entryFeeCents: true,
      teamCap: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      venue: { select: { id: true, name: true, city: true, state: true } },
      divisions: { select: { id: true, label: true } },
      registrations: { select: { status: true } },
      owner: { select: { stripeConnectChargesEnabled: true } },
    },
  });

  const now = new Date();

  const shaped = tournaments
    .filter((t) => (when === "past" ? t.endDate < now : t.endDate >= now))
    .filter((t) => !state || t.state === state)
    .filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.city.toLowerCase().includes(q.toLowerCase())
    )
    .map((t) => {
      const slotsTaken = t.registrations.filter((r) =>
        ["PAID", "PENDING"].includes(r.status)
      ).length;
      return {
        id: t.id,
        name: t.name,
        sport: t.sport,
        startDate: t.startDate,
        endDate: t.endDate,
        city: t.city,
        state: t.state,
        flyerUrl: t.flyerUrl,
        entryFeeCents: t.entryFeeCents,
        teamCap: t.teamCap,
        slotsLeft: Math.max(0, t.teamCap - slotsTaken),
        registrationOpensAt: t.registrationOpensAt,
        registrationClosesAt: t.registrationClosesAt,
        venue: t.venue,
        divisions: t.divisions,
        acceptingPayments: Boolean(t.owner?.stripeConnectChargesEnabled),
      };
    });

  return NextResponse.json({ tournaments: shaped });
}
