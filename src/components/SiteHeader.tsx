"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const primaryLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/teams", label: "Teams" },
  { href: "/venues", label: "Venues" },
];

const moreLinks = [
  { href: "/players", label: "Players" },
  { href: "/rules", label: "Rules" },
  { href: "/age-chart", label: "Age chart" },
  { href: "/coaches-corner", label: "Coach's corner" },
  { href: "/directors", label: "Become a director" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const allLinks = [...primaryLinks, ...moreLinks];

export default function SiteHeader() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/base-logo.png"
            alt="BASE - Best American Sporting Events"
            width={44}
            height={44}
            className="rounded-sm"
            priority
          />
          <span className="hidden text-xs text-steel sm:block">
            Best American Sporting Events
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/80 transition hover:text-gold"
            >
              {link.label}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="text-sm text-white/80 transition hover:text-gold"
            >
              More
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-sm bg-white py-2 text-ink shadow-lg">
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-sm hover:bg-navy/5 hover:text-red"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="text-white md:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 bg-navy px-6 py-4 md:hidden">
          {allLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-white/80 hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-white/80 hover:text-gold"
          >
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
}
