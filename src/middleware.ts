import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Gate for the /admin area. Access requires a logged-in user whose role
// is ADMIN (read from the JWT session token -- this runs on the Edge
// runtime, so no Prisma/bcrypt here). Per-tournament ownership is
// enforced inside the individual route handlers and page components,
// not here.
//
// (The old shared-password cookie was removed -- every admin now has an
// individual account.)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const jwt = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (jwt?.role === "ADMIN") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
