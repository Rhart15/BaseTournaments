import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public tournament detail -- the mobile equivalent of /tournaments/[id].
// No auth required.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
      description: true,
      flyerUrl: true,
      entryFeeCents: true,
      teamCap: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      venue: true,
      divisions: { select: { id: true, label: true, ageLimit: true, teamCap: true } },
      registrations: { select: { status: true, divisionId: true } },
      owner: { select: { stripeConnectChargesEnabled: true } },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const slotsTaken = tournament.registrations.filter((r) =>
    ["PAID", "PENDING"].includes(r.status)
  ).length;
  const registrationNotYetOpen =
    tournament.registrationOpensAt && tournament.registrationOpensAt > new Date();

  const divisions = tournament.divisions.map((d) => {
    const count = tournament.registrations.filter(
      (r) => r.divisionId === d.id && ["PAID", "PENDING"].includes(r.status)
    ).length;
    const status = registrationNotYetOpen
      ? "COMING_SOON"
      : d.teamCap !== null && count >= d.teamCap
        ? "SOLD_OUT"
        : "OPEN";
    return { id: d.id, label: d.label, ageLimit: d.ageLimit, teamCap: d.teamCap, status };
  });

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      city: tournament.city,
      state: tournament.state,
      description: tournament.description,
      flyerUrl: tournament.flyerUrl,
      entryFeeCents: tournament.entryFeeCents,
      teamCap: tournament.teamCap,
      slotsLeft: Math.max(0, tournament.teamCap - slotsTaken),
      registrationOpensAt: tournament.registrationOpensAt,
      registrationClosesAt: tournament.registrationClosesAt,
      venue: tournament.venue,
      divisions,
      acceptingPayments: Boolean(tournament.owner?.stripeConnectChargesEnabled),
    },
  });
}
