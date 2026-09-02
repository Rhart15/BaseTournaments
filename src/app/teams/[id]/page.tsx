import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
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
    include: { director: true, players: { orderBy: { lastName: "asc" } } },
  });

  if (!team) notFound();

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            {team.ageGroup}
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">{team.name}</h1>
          {team.director && (
            <p className="mt-2 text-white/70">
              Director: {team.director.name} · {team.director.region}
            </p>
          )}
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
              {team.homeCity ? `${team.homeCity}, ${team.homeState}` : "—"}
            </p>
          </div>
        </div>

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
                    {player.jerseyNumber ?? "—"}
                  </td>
                  <td className="py-2 text-ink/70">
                    {player.position ?? "—"}
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
