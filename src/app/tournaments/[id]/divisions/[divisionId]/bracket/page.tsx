import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import { seedFromPoolStandings } from "@/lib/brackets";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string; divisionId: string }>;
}) {
  const { divisionId } = await params;

  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      tournament: true,
      registrations: true,
      games: {
        where: { stage: "BRACKET" },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { bracketSlot: "asc" },
      },
    },
  });

  if (!division) notFound();

  const standings = [...division.registrations].sort((a, b) => {
    const pctA = a.poolWins / Math.max(a.poolWins + a.poolLosses, 1);
    const pctB = b.poolWins / Math.max(b.poolWins + b.poolLosses, 1);
    return pctB - pctA;
  });
  const seedOrder = seedFromPoolStandings(division.registrations);

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-xs uppercase tracking-wide text-red">
            {division.tournament.name}
          </div>
          <h1 className="display text-4xl">{division.label} Bracket</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="display text-2xl">Pool play standings</h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-steel/40 text-left text-ink/50">
              <th className="py-2">Seed</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>Run diff</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => (
              <tr key={team.id} className="border-b border-steel/15">
                <td className="py-2">{seedOrder.indexOf(team.id) + 1}</td>
                <td>{team.teamName}</td>
                <td>{team.poolWins}</td>
                <td>{team.poolLosses}</td>
                <td>{team.runsFor - team.runsAgainst}</td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-ink/50">
                  Pool play hasn&apos;t started yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="display mt-12 text-2xl">Elimination bracket</h2>
        {division.games.length === 0 ? (
          <p className="mt-3 text-ink/60">
            The bracket generates automatically once pool play standings
            are final.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {division.games.map((game) => (
              <div
                key={game.id}
                className="rounded-sm border border-steel/30 bg-white p-4 text-sm"
              >
                <div className="text-xs uppercase tracking-wide text-red">
                  {game.round ?? "Bracket game"}
                </div>
                <div className="mt-2 flex justify-between">
                  <span>{game.homeTeam?.teamName ?? "TBD"}</span>
                  <span className="font-semibold">{game.homeScore ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>{game.awayTeam?.teamName ?? "TBD"}</span>
                  <span className="font-semibold">{game.awayScore ?? "-"}</span>
                </div>
                <div className="mt-2 text-xs text-ink/50">
                  {game.fieldName ?? "Field TBD"} ·{" "}
                  {game.startTime
                    ? new Date(game.startTime).toLocaleString("en-US", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Time TBD"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
