import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import GenerateBracketButton from "./GenerateBracketButton";
import ScoreEntry from "./ScoreEntry";
import EditTournamentForm from "./EditTournamentForm";

export const dynamic = "force-dynamic";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      divisions: {
        include: {
          registrations: true,
          games: { include: { homeTeam: true, awayTeam: true } },
        },
      },
    },
  });

  if (!tournament) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          ← All tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">{tournament.name}</h1>
      </header>

      <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        <section>
          <h2 className="display mb-4 text-xl">Tournament info</h2>
          <EditTournamentForm
            tournamentId={tournament.id}
            initial={{
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
            divisions={tournament.divisions.map((d) => ({
              id: d.id,
              label: d.label,
            }))}
          />
        </section>

        {tournament.divisions.map((division) => {
          const poolGames = division.games.filter((g) => g.stage === "POOL");
          const bracketGames = division.games.filter(
            (g) => g.stage === "BRACKET"
          );
          const allPoolGamesFinal =
            poolGames.length > 0 &&
            poolGames.every((g) => g.status === "FINAL");

          return (
            <section key={division.id}>
              <div className="flex items-center justify-between">
                <h2 className="display text-xl">{division.label}</h2>
                {bracketGames.length === 0 ? (
                  <GenerateBracketButton
                    divisionId={division.id}
                    disabled={!allPoolGamesFinal}
                  />
                ) : (
                  <Link
                    href={`/tournaments/${tournament.id}/divisions/${division.id}/bracket`}
                    className="text-sm font-semibold text-red hover:text-red-dark"
                  >
                    View bracket →
                  </Link>
                )}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-ink/60">
                Pool play games
              </h3>
              <div className="mt-2 space-y-2">
                {poolGames.length === 0 && (
                  <p className="text-sm text-ink/50">
                    No pool games scheduled yet.
                  </p>
                )}
                {poolGames.map((game) => (
                  <ScoreEntry key={game.id} game={game} />
                ))}
              </div>

              {bracketGames.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold text-ink/60">
                    Bracket games
                  </h3>
                  <div className="mt-2 space-y-2">
                    {bracketGames.map((game) => (
                      <ScoreEntry key={game.id} game={game} />
                    ))}
                  </div>
                </>
              )}
            </section>
          );
        })}

        {tournament.divisions.length === 0 && (
          <p className="text-ink/60">
            No divisions yet for this tournament.
          </p>
        )}
      </div>
    </div>
  );
}
