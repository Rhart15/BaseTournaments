import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { team: true },
  });

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Registered players
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">Players</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {players.length === 0 ? (
          <p className="text-sm text-ink/60">
            No players have been registered yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel/30 text-left text-ink/60">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Position</th>
                <th className="pb-2 font-medium">Birth year</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-steel/10">
                  <td className="py-2 font-semibold">
                    {player.firstName} {player.lastName}
                  </td>
                  <td className="py-2 text-ink/70">
                    <Link
                      href={`/teams/${player.teamId}`}
                      className="hover:text-red"
                    >
                      {player.team.name}
                    </Link>
                  </td>
                  <td className="py-2 text-ink/70">
                    {player.position ?? "—"}
                  </td>
                  <td className="py-2 text-ink/70">
                    {player.birthYear ?? "—"}
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
