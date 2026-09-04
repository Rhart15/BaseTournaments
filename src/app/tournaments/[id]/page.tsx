import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { venue: true, divisions: true, registrations: true },
  });

  if (!tournament) notFound();

  const slotsTaken = tournament.registrations.filter((r) =>
    ["PAID", "PENDING"].includes(r.status)
  ).length;
  const slotsLeft = tournament.teamCap - slotsTaken;

  return (
    <>
      <SiteHeader />

      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-xs uppercase tracking-wide text-red">
            {tournament.sport === "SOFTBALL" ? "Softball" : "Baseball"}
          </div>
          <h1 className="display text-4xl">{tournament.name}</h1>
          <p className="mt-2 text-white/70">
            {tournament.venue?.name ?? tournament.city}, {tournament.state} -{" "}
            {tournament.startDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
            -
            {tournament.endDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="display text-2xl">About this event</h2>
          <p className="mt-3 text-ink/70">
            {tournament.description ??
              "Pool play into single-elimination bracket. Full rules and format details are shared with registered teams before the event."}
          </p>

          <h2 className="display mt-10 text-2xl">Divisions</h2>
          <ul className="mt-3 space-y-2">
            {tournament.divisions.map((d) => (
              <li
                key={d.id}
                className="flex justify-between border-b border-steel/20 py-2 text-sm"
              >
                <Link
                  href={`/tournaments/${tournament.id}/divisions/${d.id}`}
                  className="font-semibold hover:text-red"
                >
                  {d.label}
                </Link>
                <span className="text-xs uppercase text-ink/50">
                  Schedule - Standings - Results - Brackets
                </span>
              </li>
            ))}
            {tournament.divisions.length === 0 && (
              <li className="text-sm text-ink/50">
                Divisions will be posted soon.
              </li>
            )}
          </ul>

          <h2 className="display mt-10 text-2xl">Registered teams</h2>
          {tournament.registrations.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">
              No teams have registered yet - be the first.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tournament.registrations.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-steel/20 py-2 text-sm"
                >
                  <Link
                    href={`/registrations/${r.id}`}
                    className="font-semibold hover:text-red"
                  >
                    {r.teamName}
                  </Link>
                  <span className="text-xs uppercase text-ink/50">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-fit rounded-sm border border-steel/30 bg-white p-6">
          <div className="flex items-baseline justify-between">
            <span className="display text-3xl">
              ${(tournament.entryFeeCents / 100).toFixed(0)}
            </span>
            <span className="text-sm text-ink/50">per team</span>
          </div>
          <p
            className={`mt-1 text-sm ${
              slotsLeft <= 0 ? "text-red" : "text-ink/60"
            }`}
          >
            {slotsLeft <= 0
              ? "This tournament is full"
              : `${slotsLeft} of ${tournament.teamCap} team slots open`}
          </p>

          <div className="mt-6">
            {slotsLeft > 0 && tournament.divisions.length > 0 ? (
              <RegisterForm
                tournamentId={tournament.id}
                divisions={tournament.divisions.map((d) => ({
                  id: d.id,
                  label: d.label,
                }))}
              />
            ) : (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-sm bg-steel/30 px-6 py-3 font-semibold text-ink/50"
              >
                Registration unavailable
              </button>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}