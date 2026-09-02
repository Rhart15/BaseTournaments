import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import RosterManager from "./RosterManager";

export const dynamic = "force-dynamic";

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      tournament: true,
      division: true,
      rosterPlayers: { orderBy: { lastName: "asc" } },
    },
  });

  if (!registration) notFound();

  return (
    <>
      <SiteHeader />

      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            {registration.division.label}
          </p>
          <h1 className="display text-4xl">{registration.teamName}</h1>
          <p className="mt-2 text-white/70">
            Registered for{" "}
            <Link
              href={`/tournaments/${registration.tournamentId}`}
              className="underline hover:text-gold"
            >
              {registration.tournament.name}
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-sm border border-steel/20 p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              Coach
            </p>
            <p className="mt-1 font-semibold">{registration.coachName}</p>
            <p className="text-sm text-ink/60">{registration.coachEmail}</p>
            <p className="text-sm text-ink/60">{registration.coachPhone}</p>
          </div>
          <div className="rounded-sm border border-steel/20 p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              Status
            </p>
            <p className="mt-1 font-semibold">{registration.status}</p>
          </div>
          <div className="rounded-sm border border-steel/20 p-4">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              Roster size
            </p>
            <p className="mt-1 font-semibold">
              {registration.rosterPlayers.length} player
              {registration.rosterPlayers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="seam-divider my-10" />

        <h2 className="display text-2xl">Team roster</h2>
        <p className="mt-2 text-sm text-ink/60">
          Add or remove players on this team's roster for this tournament.
        </p>

        <div className="mt-6">
          <RosterManager
            registrationId={registration.id}
            initialPlayers={registration.rosterPlayers.map((p) => ({
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              jerseyNumber: p.jerseyNumber,
              position: p.position,
            }))}
          />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}