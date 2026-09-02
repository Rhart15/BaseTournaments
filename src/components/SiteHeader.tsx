import Link from "next/link";

const navLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/teams", label: "Teams" },
  { href: "/venues", label: "Venues" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="display text-2xl font-semibold tracking-wide">
            BASE
          </span>
          <span className="hidden text-xs text-steel sm:block">
            Best American Sporting Events
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/80 transition hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm text-white/80 hover:text-white sm:block"
          >
            Log in
          </Link>
          <Link
            href="/tournaments"
            className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-dark"
          >
            Register a team
          </Link>
        </div>
      </div>
    </header>
  );
}
