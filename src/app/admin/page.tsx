import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// NOTE: this route has no auth check yet -- wire up real admin auth
// (Clerk/Auth.js with a role claim) before this goes anywhere near
// production. It's scaffolded here so the UI shape exists.
export default async function AdminPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: "asc" },
    include: { registrations: true },
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <h1 className="display text-2xl">BASE Admin</h1>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h2 className="display text-xl">Tournaments</h2>
          <Link
            href="/admin/tournaments/new"
            className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark"
          >
            + New tournament
          </Link>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-steel/40 text-left text-ink/50">
              <th className="py-2">Tournament</th>
              <th>Dates</th>
              <th>Teams registered</th>
              <th>Paid</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => {
              const paid = t.registrations.filter((r) => r.status === "PAID").length;
              return (
                <tr key={t.id} className="border-b border-steel/15">
                  <td className="py-3">{t.name}</td>
                  <td>
                    {t.startDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td>
                    {t.registrations.length} / {t.teamCap}
                  </td>
                  <td>{paid}</td>
                  <td>
                    <Link
                      href={`/admin/tournaments/${t.id}`}
                      className="font-semibold text-red hover:text-red-dark"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
