"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

const tournamentLinks = [
  { href: "/tournaments", label: "All tournaments" },
  { href: "/tournaments/baseball", label: "Baseball" },
  { href: "/tournaments/softball", label: "Softball" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/venues", label: "BASE Venues" },
];

const toolsLinks = [
  { href: "/coaches-corner", label: "Coach's corner" },
  { href: "/age-chart", label: "Age chart" },
  { href: "#", label: "Team insurance" },
  { href: "#", label: "Background check" },
  { href: "/rules", label: "BASE official rules" },
  { href: "/directors", label: "Director recruitment" },
];

const allMobileLinks = [
  { href: "/", label: "Home" },
  ...tournamentLinks,
  ...toolsLinks,
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const { data: session } = useSession();
  const [tournamentsOpen, setTournamentsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const tournamentsRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        tournamentsRef.current &&
        !tournamentsRef.current.contains(e.target as Node)
      ) {
        setTournamentsOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="relative bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
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
          <Link
            href="/"
            className="text-sm text-white/80 transition hover:text-gold"
          >
            Home
          </Link>

          <div className="relative" ref={tournamentsRef}>
            <button
              type="button"
              onClick={() => {
                setToolsOpen(false);
                setTournamentsOpen((v) => !v);
              }}
              className="text-sm text-white/80 transition hover:text-gold"
            >
              Tournaments
            </button>
            {tournamentsOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-sm bg-white py-2 text-ink shadow-lg">
                {tournamentLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setTournamentsOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-navy/5 hover:text-red"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => {
                setTournamentsOpen(false);
                setToolsOpen((v) => !v);
              }}
              className="text-sm text-white/80 transition hover:text-gold"
            >
              Tools
            </button>
            {toolsOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-sm bg-white py-2 text-ink shadow-lg">
                {toolsLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setToolsOpen(false)}
                    className="block px-4 py-2 text-sm hover:bg-navy/5 hover:text-red"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/about"
            className="text-sm text-white/80 transition hover:text-gold"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-sm text-white/80 transition hover:text-gold"
          >
            Contact
          </Link>
        </nav>

        <div className="flex flex-shrink-0 items-center gap-4">
          {session ? (
            <>
              <Link
                href="/account"
                className="hidden text-sm text-white/80 hover:text-white sm:block"
              >
                {session.user.name?.split(" ")[0] ?? "My account"}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden text-sm text-white/60 underline hover:text-white sm:block"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden text-sm text-white/80 hover:text-white sm:block"
            >
              Log in
            </Link>
          )}
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
          {allMobileLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-white/80 hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
          {session ? (
            <>
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-white/80 hover:text-gold"
              >
                {session.user.name?.split(" ")[0] ?? "My account"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="block py-2 text-sm text-white/60 hover:text-gold"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-white/80 hover:text-gold"
            >
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}