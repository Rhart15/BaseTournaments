import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const COOKIE_NAME = "base_admin_session";

async function expectedToken(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  const data = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Protects every /admin page and the score-entry mutation route. Everything
// else (public listings, registration, checkout) is intentionally left open.
//
// Access is granted by EITHER the legacy shared-password cookie, or a real
// logged-in user whose role is ADMIN (read via the JWT session token --
// this runs on the Edge runtime, so it can't use Prisma/bcrypt directly).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isProtectedApi =
    pathname.startsWith("/api/games/") && pathname.endsWith("/score");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const jwt = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (jwt?.role === "ADMIN") {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = token && token === (await expectedToken());

  if (valid) return NextResponse.next();

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/games/:path*"],
};
