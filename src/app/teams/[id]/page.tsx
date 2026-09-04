import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      director: true,
      players: { orderBy: { lastName: "asc" } },
      registrations: { include: { tournament: true } },
    },
  });

  if (!team) notFound();

  const stats = team.registrations.reduce(
    (acc, r) => {
      acc.wins += r.poolWins + r.bracketWins;
      acc.losses += r.poolLosses + r.bracketLosses;
      acc.runsFor += r.runsFor;
      acc.runsAgainst += r.runsAgainst;
      return acc;
    },
    { wins: 0, losses: 0, runsFor: 0, runsAgainst: 0 }
  );
  const gamesPlayed = stats.wins + stats.losses;
  const winPct = gamesPlayed > 0 ? stats.wins / gamesPlayed : 0;
  const tournamentsPlayed = team.registrations.length;

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-6">
            {team.logoUrl && (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm border border-white/20">
                <Image src={team.logoUrl} alt={team.name} fill className="object-cover" />
              </div>
            )}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gold">
                {team.ageGroup}
              </p>
              <h1 className="display mt-4 text-5xl font-semibold">{team.name}</h1>
              {team.director && (
                <p className="mt-2 text-white/70">
                  Director: {team.director.name} - {team.director.region}
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/teams/${team.id}/manage`}
            className="mt-6 inline-block rounded-sm border border-white/30 px-5 py-2 text-sm font-semibold hover:border-white"
          >
            Manage this team
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-sm border border-steel/20 p-6">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              Insurance status
            </p>
            <p className="mt-1 font-semibold">{team.insuranceStatus}</p>
            {team.insuranceProvider && (
              <p className="mt-1 text-sm text-ink/60">
                {team.insuranceProvider}
              </p>
            )}
          </div>
          <div className="rounded-sm border border-steel/20 p-6">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              Home
            </p>
            <p className="mt-1 font-semibold">
              {team.homeCity ? `${team.homeCity}, ${team.homeState}` : "-"}
            </p>
          </div>
        </div>

        <div className="seam-divider my-10" />

        <h2 className="display text-xl">
          Record{" "}
          <span className="text-sm font-normal text-ink/50">
            (all tournaments - {tournamentsPlayed} played)
          </span>
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-steel/15">
                <td className="py-2 text-ink/60">W-L</td>
                <td className="py-2 text-right font-semibold">
                  {stats.wins}-{stats.losses}
                </td>
              </tr>
              <tr className="border-b border-steel/15">
                <td className="py-2 text-ink/60">Win %</td>
                <td className="py-2 text-right font-semibold">
                  {(winPct * 100).toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-steel/15">
                <td className="py-2 text-ink/60">Runs scored</td>
                <td className="py-2 text-right font-semibold">{stats.runsFor}</td>
              </tr>
              <tr className="border-b border-steel/15">
                <td className="py-2 text-ink/60">Runs allowed</td>
                <td className="py-2 text-right font-semibold">{stats.runsAgainst}</td>
              </tr>
              <tr className="border-b border-steel/15">
                <td className="py-2 text-ink/60">Run difference</td>
                <td className="py-2 text-right font-semibold">
                  {stats.runsFor - stats.runsAgainst}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {team.registrations.length > 0 && (
          <>
            <h2 className="display mt-10 text-xl">Tournament history</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-steel/30 text-left text-ink/60">
                  <th className="pb-2 font-medium">Tournament</th>
                  <th className="pb-2 font-medium">Record</th>
                  <th className="pb-2 font-medium">Placement</th>
                  <th className="pb-2 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {team.registrations.map((r) => (
                  <tr key={r.id} className="border-b border-steel/10">
                    <td className="py-2">
                      <Link
                        href={`/tournaments/${r.tournamentId}`}
                        className="font-semibold hover:text-red"
                      >
                        {r.tournament.name}
                      </Link>
                    </td>
                    <td className="py-2 text-ink/70">
                      {r.poolWins + r.bracketWins}-{r.poolLosses + r.bracketLosses}
                    </td>
                    <td className="py-2 text-ink/70">
                      {r.finalPlacement ?? "-"}
                    </td>
                    <td className="py-2 text-xs uppercase text-ink/60">
                      {r.isVipComp ? "Paid (VIP)" : r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="seam-divider my-10" />

        <h2 className="display text-xl">Roster</h2>
        {team.players.length === 0 ? (
          <p className="mt-4 text-sm text-ink/60">
            No players have been added to this roster yet.
          </p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-steel/30 text-left text-ink/60">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Position</th>
                <th className="pb-2 font-medium">Background check</th>
              </tr>
            </thead>
            <tbody>
              {team.players.map((player) => (
                <tr key={player.id} className="border-b border-steel/10">
                  <td className="py-2 font-semibold">
                    {player.firstName} {player.lastName}
                  </td>
                  <td className="py-2 text-ink/70">
                    {player.jerseyNumber ?? "-"}
                  </td>
                  <td className="py-2 text-ink/70">
                    {player.position ?? "-"}
                  </td>
                  <td className="py-2 text-xs uppercase text-ink/60">
                    {player.backgroundCheckStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
