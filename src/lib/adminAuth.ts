import { cookies } from "next/headers";
import { auth } from "@/auth";

// Admin access is granted by EITHER:
//   1. The legacy shared password cookie (kept for backward compatibility
//      during the transition to real accounts), or
//   2. A real logged-in user whose role is ADMIN.
// This lets multiple staff have their own individual logins going forward,
// while not breaking whoever is still using the shared password.

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
  const session = await auth();
  if (session?.user.role === "ADMIN") return true;

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
