import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Get in touch
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">Contact us</h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2">
          <ContactForm />
          <div>
            <h2 className="display text-xl">Reach us directly</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink/70">
              <li>info@basetournament.com</li>
              <li>(501) 837-3825</li>
              <li>Little Rock, AR</li>
            </ul>
            <p className="mt-6 text-sm text-ink/70">
              For tournament-day questions, please contact your tournament
              director directly — they can typically respond faster than our
              general inbox.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
