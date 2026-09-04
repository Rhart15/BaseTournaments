import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import MarkHandledButton from "@/components/admin/MarkHandledButton";
import DirectorRow from "@/components/admin/DirectorRow";
import AddDirectorForm from "@/components/admin/AddDirectorForm";
import TeamRow from "@/components/admin/TeamRow";
import AddTeamForm from "@/components/admin/AddTeamForm";

export const dynamic = "force-dynamic";

// Protected by middleware.ts: requires either the legacy shared admin
// password or a logged-in user with role ADMIN.
export default async function AdminPage() {
  const session = await auth();
  const [tournaments, directors, teams, unhandledContacts] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: { startDate: "asc" },
      include: { registrations: true },
    }),
    prisma.director.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { director: true, _count: { select: { players: true } } },
    }),
    prisma.contactSubmission.findMany({
      where: { handled: false },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between bg-navy px-6 py-5 text-white">
        <h1 className="display text-2xl">BASE Admin</h1>
        <div className="flex items-center gap-4">
          {session?.user.isSuperAdmin && (
            <Link
              href="/admin/admins"
              className="text-sm text-white/70 underline hover:text-white"
            >
              Manage admins
            </Link>
          )}
          {unhandledContacts.length > 0 && (
            <span className="rounded-sm bg-red px-3 py-1 text-xs font-semibold">
              {unhandledContacts.length} new message
              {unhandledContacts.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-14 px-6 py-10">
        {/* Tournaments */}
        <section>
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
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink/50">
                    No tournaments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Directors */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="display text-xl">Directors</h2>
            <AddDirectorForm />
          </div>
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-steel/40 text-left text-ink/50">
                <th className="py-2">Name</th>
                <th>Region</th>
                <th>Sanction fee</th>
                <th>Background check</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {directors.map((d) => (
                <DirectorRow key={d.id} director={d} />
              ))}
              {directors.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink/50">
                    No directors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Teams */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="display text-xl">Teams</h2>
            <AddTeamForm directors={directors} />
          </div>
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-steel/40 text-left text-ink/50">
                <th className="py-2">Team</th>
                <th>Division</th>
                <th>Director</th>
                <th>Roster size</th>
                <th>Insurance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <TeamRow
                  key={t.id}
                  team={{
                    id: t.id,
                    name: t.name,
                    ageGroup: t.ageGroup,
                    organization: t.organization,
                    homeCity: t.homeCity,
                    homeState: t.homeState,
                    directorId: t.directorId,
                    director: t.director ? { name: t.director.name } : null,
                    insuranceStatus: t.insuranceStatus,
                    playerCount: t._count.players,
                  }}
                  directors={directors}
                />
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink/50">
                    No teams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Contact inbox */}
        <section>
          <h2 className="display text-xl">Contact inbox</h2>
          {unhandledContacts.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50">
              No new messages.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {unhandledContacts.map((c) => (
                <div
                  key={c.id}
                  className="rounded-sm border border-steel/20 p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {c.name} - {c.email}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-ink/50">
                        {c.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <MarkHandledButton id={c.id} />
                    </div>
                  </div>
                  {c.subject && (
                    <p className="mt-1 font-medium text-ink/70">
                      {c.subject}
                    </p>
                  )}
                  <p className="mt-2 text-ink/70">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
