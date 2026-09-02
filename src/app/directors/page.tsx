import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

export default function DirectorRecruitmentPage() {
  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Become a director
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">
            Run tournaments under the BASE banner
          </h1>
          <p className="mt-4 max-w-xl text-white/80">
            BASE partners with independent tournament directors across
            Arkansas. Bring your region, we bring the brand, the platform,
            and the support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="display text-2xl text-red">Keep your region</div>
            <p className="mt-2 text-sm text-ink/70">
              Directors operate their own region independently, with BASE
              providing the sanctioning, branding, and back-office tools.
            </p>
          </div>
          <div>
            <div className="display text-2xl text-red">Built-in registration</div>
            <p className="mt-2 text-sm text-ink/70">
              Teams register and pay online through the BASE platform — no
              spreadsheets, no chasing checks.
            </p>
          </div>
          <div>
            <div className="display text-2xl text-red">Compliance handled</div>
            <p className="mt-2 text-sm text-ink/70">
              Background checks and team insurance are tracked centrally, so
              directors can focus on running great events.
            </p>
          </div>
        </div>

        <div className="seam-divider my-12" />

        <h2 className="display text-2xl">What directors say</h2>
        <blockquote className="mt-4 border-l-4 border-red pl-4 text-ink/80 italic">
          &ldquo;BASE let me focus on the field instead of the paperwork. The
          registration platform alone saved me hours every week.&rdquo;
          <footer className="mt-2 text-sm not-italic text-ink/60">
            — BASE Tournament Director
          </footer>
        </blockquote>

        <div className="mt-12">
          <Link
            href="/contact"
            className="inline-block rounded-sm bg-red px-6 py-3 font-semibold text-white hover:bg-red-dark"
          >
            Apply to become a director
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
