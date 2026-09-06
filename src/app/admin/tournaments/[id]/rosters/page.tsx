import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import RosterReviewRow from "./RosterReviewRow";

export const dynamic = "force-dynamic";

export default async function TournamentRostersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        where: { status: { in: ["PAID", "PENDING"] } },
        include: { division: true, rosterPlayers: true },
        orderBy: { teamName: "asc" },
      },
    },
  });

  if (!tournament) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link
          href={`/admin/tournaments/${id}`}
          className="text-sm text-white/60 hover:text-white"
        >
          Back to {tournament.name}
        </Link>
        <h1 className="display mt-1 text-2xl">Roster approvals</h1>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel/30 text-left text-ink/50">
              <th className="py-2">Team</th>
              <th>Division</th>
              <th>Players</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tournament.registrations.map((r) => (
              <RosterReviewRow
                key={r.id}
                registration={{
                  id: r.id,
                  teamName: r.teamName,
                  division: r.division.label,
                  playerCount: r.rosterPlayers.length,
                  rosterApprovalStatus: r.rosterApprovalStatus,
                  rosterReviewNote: r.rosterReviewNote,
                }}
              />
            ))}
            {tournament.registrations.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink/50">
                  No registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
