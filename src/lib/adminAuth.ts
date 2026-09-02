import { cookies } from "next/headers";

// Lightweight admin gate: a single shared password (ADMIN_PASSWORD env var)
// protects /admin and the score-entry API. This is intentionally simple so
// the site is safe to hand to one or two BASE staff immediately.
//
// UPGRADE BEFORE REAL LAUNCH: swap this for Clerk or Auth.js with per-user
// accounts and a role claim once more than one or two staff need access,
// so you get individual logins, audit trails, and easy revocation.
//
// Uses Web Crypto (globalThis.crypto.subtle) rather than Node's `crypto`
// module so the same code works in both the Node API routes and the Edge
// middleware runtime.

const COOKIE_NAME = "base_admin_session";

export async function expectedToken(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  const data = new TextEncoder().encode(secret);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAdminAuthed(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === (await expectedToken());
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function checkPassword(candidate: string): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;
  return candidate === process.env.ADMIN_PASSWORD;
}

export { COOKIE_NAME };
