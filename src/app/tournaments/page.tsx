import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: "asc" },
    include: { venue: true, registrations: true, divisions: true },
  });

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="display text-4xl">Tournament schedule</h1>
          <p className="mt-2 text-white/70">
            Baseball and softball events across Arkansas. Tap an event for
            divisions, fees, and open slots.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {tournaments.length === 0 && (
          <p className="text-ink/60">
            No tournaments are published yet — check back soon.
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const slotsTaken = t.registrations.filter((r) =>
              ["PAID", "PENDING"].includes(r.status)
            ).length;
            const slotsLeft = t.teamCap - slotsTaken;
            const isFull = slotsLeft <= 0;

            const sameMonth =
              t.startDate.getMonth() === t.endDate.getMonth() &&
              t.startDate.getDate() !== t.endDate.getDate();

            const dateLabel = sameMonth
              ? `${t.startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}–${t.endDate.getDate()}`
              : t.startDate.getTime() === t.endDate.getTime()
              ? t.startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : `${t.startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })} – ${t.endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`;

            return (
              <div
                key={t.id}
                className="flex flex-col overflow-hidden rounded-sm border border-steel/20 bg-white"
              >
                <div className="relative flex h-32 items-center justify-center bg-navy">
                  <span className="display text-lg text-gold">
                    {t.sport === "SOFTBALL" ? "Softball" : "Baseball"}
                  </span>
                  {isFull && (
                    <span className="absolute right-3 top-3 rounded-sm bg-red px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Full
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="display text-lg leading-tight">{t.name}</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {dateLabel} &middot; {t.city}
                  </p>

                  {t.divisions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.divisions.map((d) => (
                        <span
                          key={d.id}
                          className="rounded-sm bg-cream px-2 py-0.5 text-[11px] font-medium text-ink/70"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {t.description && (
                    <p className="mt-3 text-xs text-ink/50">
                      {t.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div>
                      <div className="font-semibold">
                        ${(t.entryFeeCents / 100).toFixed(0)}
                      </div>
                      <div className="text-xs text-ink/50">
                        {isFull ? "Team cap reached" : `${slotsLeft} of ${t.teamCap} slots open`}
                      </div>
                    </div>
                    <Link
                      href={`/tournaments/${t.id}`}
                      className={`rounded-sm px-4 py-2 text-sm font-semibold text-white transition ${
                        isFull
                          ? "bg-steel/40 cursor-default"
                          : "bg-red hover:bg-red-dark"
                      }`}
                    >
                      {isFull ? "Details" : "Register"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
