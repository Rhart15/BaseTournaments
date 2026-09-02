import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="absolute -right-24 top-0 h-full w-1/2 opacity-20"
          style={{
            background:
              "linear-gradient(135deg, transparent 40%, var(--red) 40%, var(--red) 44%, transparent 44%, transparent 55%, var(--gold) 55%, var(--gold) 58%, transparent 58%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Little Rock, Arkansas
          </p>
          <h1 className="display mt-4 max-w-2xl text-6xl font-semibold leading-[0.95] sm:text-7xl">
            Where champions play.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-white/80">
            Real competition, fair brackets, and events built around
            athletes — not politics. Register your team for an upcoming
            BASE tournament.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/tournaments"
              className="rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark"
            >
              Browse tournaments
            </Link>
            <Link
              href="/about"
              className="rounded-sm border border-white/30 px-6 py-3 font-semibold text-white transition hover:border-white"
            >
              Why BASE
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="display text-3xl">Upcoming events</h2>
        <div className="seam-divider my-6" />
        <p className="text-ink/70">
          Live tournament listings load here from the schedule below —
          date, division, entry fee, and open slots at a glance.
        </p>
        <Link
          href="/tournaments"
          className="mt-4 inline-block font-semibold text-red hover:text-red-dark"
        >
          See the full schedule
        </Link>
      </section>

      <section className="bg-navy-deep py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-3">
          <div>
            <div className="display text-2xl text-gold">Fair brackets</div>
            <p className="mt-2 text-sm text-white/70">
              Pool play seeds every bracket — no politics, just results on
              the field.
            </p>
          </div>
          <div>
            <div className="display text-2xl text-gold">Live scores</div>
            <p className="mt-2 text-sm text-white/70">
              Standings and brackets update in real time as scores are
              entered at the field.
            </p>
          </div>
          <div>
            <div className="display text-2xl text-gold">Secure registration</div>
            <p className="mt-2 text-sm text-white/70">
              Register and pay online in minutes, with confirmation sent
              straight to your inbox.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
