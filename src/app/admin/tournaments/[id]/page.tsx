import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession, isLeadAdmin, canManageTournament } from "@/lib/adminAuth";
import AdminTournamentTabs from "./AdminTournamentTabs";

export const dynamic = "force-dynamic";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getAdminSession();
  if (!session) redirect(`/login?next=/admin/tournaments/${id}`);
  const lead = isLeadAdmin(session);

  // A regular admin can't even see a tournament they don't own.
  if (!(await canManageTournament(id, session))) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, stripeConnectChargesEnabled: true } },
      divisions: {
        include: {
          registrations: true,
          games: { include: { homeTeam: true, awayTeam: true } },
        },
      },
    },
  });

  if (!tournament) notFound();

  const admins = lead
    ? await prisma.user.findMany({
        where: { role: "ADMIN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  const divisions = tournament.divisions.map((division) => {
    const poolGames = division.games.filter((g) => g.stage === "POOL");
    const bracketGames = division.games.filter((g) => g.stage === "BRACKET");
    const allPoolGamesFinal =
      poolGames.length > 0 && poolGames.every((g) => g.status === "FINAL");

    return {
      id: division.id,
      label: division.label,
      resultsFinalized: division.resultsFinalized,
      bracketPublished: division.bracketPublished,
      usePoolPlay: division.usePoolPlay,
      gameGuarantee: division.gameGuarantee,
      poolGames,
      bracketGames,
      allPoolGamesFinal,
      registeredCount: division.registrations.filter(
        (r) => r.status !== "CANCELLED" && r.status !== "REFUNDED"
      ).length,
    };
  });

  return (
    <AdminTournamentTabs
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      flyerUrl={tournament.flyerUrl}
      isLead={lead}
      owner={{
        id: tournament.owner?.id ?? null,
        name: tournament.owner?.name ?? null,
        acceptsPayments: Boolean(tournament.owner?.stripeConnectChargesEnabled),
      }}
      admins={admins}
      editFormInitial={{
        name: tournament.name,
        sport: tournament.sport,
        startDate: tournament.startDate.toISOString().slice(0, 10),
        endDate: tournament.endDate.toISOString().slice(0, 10),
        city: tournament.city,
        state: tournament.state,
        entryFeeDollars: tournament.entryFeeCents / 100,
        teamCap: tournament.teamCap,
        description: tournament.description ?? "",
      }}
      editFormDivisions={tournament.divisions.map((d) => ({
        id: d.id,
        label: d.label,
        teamCap: d.teamCap,
      }))}
      divisions={divisions}
    />
  );
}
