import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            About BASE
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">
            Why BASE Events
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-lg leading-relaxed text-ink/80">
          BASE — Best American Sporting Events — was built on a simple idea:
          youth baseball and softball tournaments should be about the
          athletes, not politics. We run fair, well-organized pool-play-into-
          bracket events across Arkansas, with real competition and clear
          rules for every division.
        </p>

        <div className="seam-divider my-10" />

        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="display text-2xl text-red">Fair play</div>
            <p className="mt-2 text-sm text-ink/70">
              Every bracket is seeded from real pool-play results — no
              favoritism, no shortcuts.
            </p>
          </div>
          <div>
            <div className="display text-2xl text-red">Local roots</div>
            <p className="mt-2 text-sm text-ink/70">
              Founded and operated in Little Rock, Arkansas, with independent
              tournament directors running events across the state.
            </p>
          </div>
          <div>
            <div className="display text-2xl text-red">Safety first</div>
            <p className="mt-2 text-sm text-ink/70">
              Every team and coach is background-checked and insured before
              stepping on the field.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
