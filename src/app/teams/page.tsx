import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TeamsDirectory from "@/components/TeamsDirectory";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { director: true },
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
          <TeamsDirectory
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              ageGroup: t.ageGroup,
              homeCity: t.homeCity,
              homeState: t.homeState,
              directorName: t.director?.name ?? null,
            }))}
          />
        )}
      </section>
      <SiteFooter />
    </>
  );
}
