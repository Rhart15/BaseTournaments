import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: "asc" },
    include: { venue: true, registrations: true },
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

        <ul className="divide-y divide-steel/30 border-y border-steel/30">
          {tournaments.map((t) => {
            const slotsTaken = t.registrations.filter((r) =>
              ["PAID", "PENDING"].includes(r.status)
            ).length;
            const slotsLeft = t.teamCap - slotsTaken;

            return (
              <li key={t.id} className="py-6">
                <Link
                  href={`/tournaments/${t.id}`}
                  className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="text-xs uppercase tracking-wide text-red">
                      {t.sport === "SOFTBALL" ? "Softball" : "Baseball"}
                    </div>
                    <div className="display text-2xl">{t.name}</div>
                    <div className="text-sm text-ink/60">
                      {t.venue?.name ?? t.city}, {t.state} ·{" "}
                      {t.startDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      –
                      {t.endDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <div className="font-semibold">
                        ${(t.entryFeeCents / 100).toFixed(0)}
                      </div>
                      <div className="text-ink/50">entry fee</div>
                    </div>
                    <div>
                      <div
                        className={`font-semibold ${
                          slotsLeft <= 0 ? "text-red" : ""
                        }`}
                      >
                        {slotsLeft <= 0 ? "Full" : `${slotsLeft} open`}
                      </div>
                      <div className="text-ink/50">of {t.teamCap} teams</div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <SiteFooter />
    </>
  );
}
