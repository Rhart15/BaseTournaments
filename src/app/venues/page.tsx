import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tournaments: true } } },
  });

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Where we play
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">Venues</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        {venues.length === 0 ? (
          <p className="text-sm text-ink/60">
            No venues have been added yet.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="rounded-sm border border-steel/20 p-6"
              >
                <h2 className="display text-lg">{venue.name}</h2>
                <p className="mt-1 text-sm text-ink/70">
                  {venue.address}, {venue.city}, {venue.state}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-ink/50">
                  {venue.fieldCount} field{venue.fieldCount === 1 ? "" : "s"} ·{" "}
                  {venue._count.tournaments} tournament
                  {venue._count.tournaments === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
