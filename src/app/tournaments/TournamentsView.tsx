import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

const bannerColors = ["bg-navy", "bg-navy-deep"];

type Params = {
  month?: string;
  division?: string;
  state?: string;
  q?: string;
  when?: string;
};

const heroCopy = {
  ALL: {
    title: "Tournament schedule",
    blurb:
      "Baseball and softball events across Arkansas. Tap an event for divisions, fees, and open slots.",
  },
  SOFTBALL: {
    title: "2026-2027 Softball season",
    blurb:
      "All BASE softball tournaments for the current season. Tap an event for divisions, fees, and open slots.",
  },
  BASEBALL: {
    title: "2026-2027 Baseball season",
    blurb:
      "All BASE baseball tournaments for the current season. Tap an event for divisions, fees, and open slots.",
  },
};

export default async function TournamentsView({
  lockedSport,
  params,
}: {
  lockedSport?: "SOFTBALL" | "BASEBALL";
  params: Params;
}) {
  const tournaments = await prisma.tournament.findMany({
    where: lockedSport ? { sport: lockedSport } : undefined,
    orderBy: { startDate: "asc" },
    include: { venue: true, registrations: true, divisions: true },
  });

  const isPast = params.when === "past";
  const now = new Date();
  const dateFiltered = tournaments.filter((t) =>
    isPast ? t.endDate < now : t.endDate >= now
  );

  const months = Array.from(
    new Set<string>(
      dateFiltered.map((t) =>
        t.startDate.toLocaleDateString("en-US", { month: "long" })
      )
    )
  );
  const divisions: string[] = Array.from(
    new Set<string>(dateFiltered.flatMap((t) => t.divisions.map((d) => d.label)))
  ).sort();
  const states: string[] = Array.from(
    new Set<string>(dateFiltered.map((t) => t.state))
  ).sort();

  const filtered = dateFiltered.filter((t) => {
    if (
      params.month &&
      t.startDate.toLocaleDateString("en-US", { month: "long" }) !==
        params.month
    ) {
      return false;
    }
    if (
      params.division &&
      !t.divisions.some((d) => d.label === params.division)
    ) {
      return false;
    }
    if (params.state && t.state !== params.state) {
      return false;
    }
    if (
      params.q &&
      !t.name.toLowerCase().includes(params.q.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const hasActiveFilters =
    params.month || params.division || params.state || params.q;

  const basePath =
    lockedSport === "SOFTBALL"
      ? "/tournaments/softball"
      : lockedSport === "BASEBALL"
      ? "/tournaments/baseball"
      : "/tournaments";

  const hero = heroCopy[lockedSport ?? "ALL"];

  const tabs = [
    { label: "All events", href: "/tournaments", active: !lockedSport },
    {
      label: "Softball season",
      href: "/tournaments/softball",
      active: lockedSport === "SOFTBALL",
    },
    {
      label: "Baseball season",
      href: "/tournaments/baseball",
      active: lockedSport === "BASEBALL",
    },
  ];

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="display text-4xl">
            {isPast ? "Past results" : hero.title}
          </h1>
          <p className="mt-2 text-white/70">
            {isPast
              ? "Results and final brackets from completed BASE tournaments."
              : hero.blurb}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-sm px-5 py-2 text-sm font-semibold text-white transition ${
                  tab.active ? "bg-red-dark" : "bg-red hover:bg-red-dark"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <Link
            href={`${basePath}${isPast ? "" : "?when=past"}`}
            className="rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold text-ink/70 hover:border-red hover:text-red"
          >
            {isPast ? "Upcoming events" : "Past results"}
          </Link>
        </div>

        <form
          action={basePath}
          className="mt-6 flex flex-wrap items-end gap-4 rounded-sm border border-steel/20 bg-cream p-4"
        >
          {isPast && <input type="hidden" name="when" value="past" />}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Month
            </label>
            <select
              name="month"
              defaultValue={params.month ?? ""}
              className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
            >
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Event
            </label>
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search by name"
              className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              Division
            </label>
            <select
              name="division"
              defaultValue={params.division ?? ""}
              className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
            >
              <option value="">All divisions</option>
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
              State
            </label>
            <select
              name="state"
              defaultValue={params.state ?? ""}
              className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark"
          >
            Search
          </button>
          {hasActiveFilters && (
            <Link
              href={isPast ? `${basePath}?when=past` : basePath}
              className="rounded-sm border border-steel/40 px-5 py-2 text-sm font-semibold text-ink/70 hover:border-red hover:text-red"
            >
              Reset
            </Link>
          )}
        </form>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        {filtered.length === 0 && (
          <p className="text-ink/60">
            No tournaments match those filters - try clearing them or check
            back soon.
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, idx) => {
            const noteText = (t.description ?? "").toLowerCase();
            const isClosed =
              noteText.includes("sold out") ||
              noteText.includes("registration closed");

            const slotsTaken = t.registrations.filter((r) =>
              ["PAID", "PENDING"].includes(r.status)
            ).length;
            const slotsLeft = t.teamCap - slotsTaken;
            const isFull = isClosed || slotsLeft <= 0;

            const sameMonth =
              t.startDate.getMonth() === t.endDate.getMonth() &&
              t.startDate.getDate() !== t.endDate.getDate();

            const dateLabel = sameMonth
              ? `${t.startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}-${t.endDate.getDate()}`
              : t.startDate.getTime() === t.endDate.getTime()
              ? t.startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : `${t.startDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })} - ${t.endDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`;

            return (
              <div
                key={t.id}
                className="flex flex-col overflow-hidden rounded-sm border border-steel/20 bg-white"
              >
                <div
                  className={`relative flex h-32 items-center justify-center ${bannerColors[idx % bannerColors.length]}`}
                >
                  <span className="display text-lg text-gold">
                    {t.sport === "SOFTBALL" ? "Softball" : "Baseball"}
                  </span>
                  {isFull && (
                    <span className="absolute right-3 top-3 rounded-sm bg-red px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {isClosed ? "Closed" : "Full"}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="display text-lg leading-tight">{t.name}</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {dateLabel} - {t.city}
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
                        {isPast
                          ? "Event completed"
                          : isClosed
                          ? "Registration closed"
                          : isFull
                          ? "Team cap reached"
                          : `${slotsLeft} of ${t.teamCap} slots open`}
                      </div>
                    </div>
                    {isPast ? (
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
                      >
                        View results
                      </Link>
                    ) : isFull ? (
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="rounded-sm bg-steel/40 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Details
                      </Link>
                    ) : (
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-dark"
                      >
                        Register
                      </Link>
                    )}
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