import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The mobile API is its own bearer-token-authenticated surface (see
  // src/lib/mobileAuth.ts) -- no cookies involved, so an open CORS policy
  // doesn't expose anything a direct curl with a stolen token couldn't
  // already do. Wide open lets the Expo app's web target (and this
  // during local dev) call it cross-origin from any port/host. Every
  // mobile route still does its own auth check; this only adds headers,
  // it never gates.
  if (pathname.startsWith("/api/mobile/")) {
    if (req.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }));
    }
    return withCors(NextResponse.next());
  }

  // Gate for the /admin area. Access requires a logged-in user whose role
  // is ADMIN (read from the JWT session token -- this runs on the Edge
  // runtime, so no Prisma/bcrypt here). Per-tournament ownership is
  // enforced inside the individual route handlers and page components,
  // not here.
  //
  // (The old shared-password cookie was removed -- every admin now has an
  // individual account.)
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
  matcher: ["/admin/:path*", "/api/mobile/:path*"],
};
