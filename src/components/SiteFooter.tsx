import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="display text-xl text-white">BASE Events</div>
            <p className="mt-2 max-w-xs text-sm">
              Raising the standard of youth baseball and softball through
              real competition, fair brackets, and events built around
              athletes.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Links</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/tournaments">Tournaments</Link></li>
              <li><Link href="/teams">Teams</Link></li>
              <li><Link href="/venues">Venues</Link></li>
              <li><Link href="/rules">Official rules</Link></li>
              <li><Link href="/age-chart">Age chart</Link></li>
              <li><Link href="/coaches-corner">Coach&apos;s corner</Link></li>
              <li><Link href="/directors">Become a director</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Contact</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>info@basetournament.com</li>
              <li>(501) 837-3825</li>
              <li>Little Rock, AR</li>
            </ul>
          </div>
        </div>
        <div className="seam-divider mt-10" />
        <p className="mt-6 text-xs">
          © {new Date().getFullYear()} BASE Events. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
