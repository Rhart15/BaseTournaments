import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function RulesPage() {
  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Official rules
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">
            Tournament rules
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
          <p className="text-sm font-semibold text-ink">
            Full rulebook coming soon
          </p>
          <p className="mt-2 text-sm text-ink/70">
            This page will host the complete BASE rulebook covering game
            length, pitching restrictions, run rules, and division-specific
            regulations. In the meantime, contact your tournament director
            with any rules questions.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          <div>
            <h2 className="display text-xl">General format</h2>
            <p className="mt-2 text-sm text-ink/70">
              All BASE tournaments run pool play followed by a single-
              elimination bracket, seeded by pool-play record.
            </p>
          </div>
          <div>
            <h2 className="display text-xl">Eligibility</h2>
            <p className="mt-2 text-sm text-ink/70">
              Player age and division eligibility follows the official BASE
              age chart. See the Age Chart page for birth-year cutoffs by
              division.
            </p>
          </div>
          <div>
            <h2 className="display text-xl">Conduct</h2>
            <p className="mt-2 text-sm text-ink/70">
              BASE has zero tolerance for unsportsmanlike conduct toward
              umpires, opposing teams, or staff.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
