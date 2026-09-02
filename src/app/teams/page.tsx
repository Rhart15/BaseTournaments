import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  PENDING: "text-ink/50",
  SUBMITTED: "text-gold",
  APPROVED: "text-green-700",
  EXPIRED: "text-red",
};

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { director: true, _count: { select: { players: true } } },
  });

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Registered teams
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">Teams</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {teams.length === 0 ? (
          <p className="text-sm text-ink/60">
            No teams have registered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-steel/30 text-left text-ink/60">
                  <th className="pb-2 font-medium">Team</th>
                  <th className="pb-2 font-medium">Division</th>
                  <th className="pb-2 font-medium">Director</th>
                  <th className="pb-2 font-medium">Roster</th>
                  <th className="pb-2 font-medium">Insurance</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-steel/10">
                    <td className="py-3 font-semibold">
                      <Link
                        href={`/teams/${team.id}`}
                        className="hover:text-red"
                      >
                        {team.name}
                      </Link>
                    </td>
                    <td className="py-3 text-ink/70">{team.ageGroup}</td>
                    <td className="py-3 text-ink/70">
                      {team.director?.name ?? "—"}
                    </td>
                    <td className="py-3 text-ink/70">
                      {team._count.players} player
                      {team._count.players === 1 ? "" : "s"}
                    </td>
                    <td
                      className={`py-3 text-xs font-semibold uppercase ${statusColor[team.insuranceStatus]}`}
                    >
                      {team.insuranceStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
