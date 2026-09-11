import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { AdminSession } from "@/lib/adminAuth";

// Bearer-token auth for the Expo app, parallel to (not replacing) the
// website's NextAuth cookie session. Same `User` table and passwords;
// different transport, because a mobile client can't hold a browser
// cookie. Deliberately kept out of src/auth.ts so the web login flow is
// untouched.
//
//   - Access token: short-lived (15 min), stateless JWT (HS256, signed
//     with AUTH_SECRET -- the same root secret already trusted for the
//     website's session, so no new secret to provision anywhere).
//     Carries role/isSuperAdmin so mobile routes can build the same
//     AdminSession shape the website's guard functions expect, without a
//     DB hit on every request.
//   - Refresh token: opaque random string, NOT a JWT. Only its SHA-256
//     hash is ever stored (MobileRefreshToken.tokenHash), so a leaked DB
//     row can't be replayed. Rotated on every /auth/refresh call; if an
//     already-rotated (i.e. stolen-and-reused) token is presented, the
//     whole chain for that user is revoked.

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const JWT_ISSUER = "base-tournament-mobile";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type MobileTokenUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
};

export async function verifyPassword(email: string, password: string): Promise<MobileTokenUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function signAccessToken(user: MobileTokenUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    typ: "access",
  } satisfies JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secretKey());
}

type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
};

/** Verifies a mobile access token from an Authorization: Bearer header. Returns null on any failure -- expired, malformed, wrong secret, wrong issuer/type. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: JWT_ISSUER });
    if (payload.typ !== "access" || typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
    };
  } catch {
    return null;
  }
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export type MobileSession = { user: MobileTokenUser };

/** The session iff the request carries a valid mobile access token, else null. Analogous to auth() for the web, but reads the Authorization header instead of a cookie. */
export async function getMobileSession(req: NextRequest): Promise<MobileSession | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin,
    },
  };
}

/**
 * Same as getMobileSession, but shaped as an AdminSession (the type
 * src/lib/adminAuth.ts's guard-and-can- functions expect) and null unless
 * role === "ADMIN". Pass the result straight into guardTournament(id,
 * session), canManageTournament(id, session), etc. -- the mobile routes
 * reuse the exact same permission logic the website uses, just sourcing
 * the session from a bearer token instead of a cookie.
 */
export async function getMobileAdminSession(req: NextRequest): Promise<AdminSession | null> {
  const session = await getMobileSession(req);
  if (!session || session.user.role !== "ADMIN") return null;
  return {
    user: session.user,
    expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  } as AdminSession;
}

// --- Refresh tokens ----------------------------------------------------

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Issues a brand-new refresh token for a just-logged-in user. */
export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(48).toString("base64url");
  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return raw;
}

export type RefreshResult =
  | { ok: true; userId: string; refreshToken: string }
  | { ok: false; reason: "invalid" | "expired" | "revoked" };

/**
 * Validates + rotates a refresh token: the presented token is revoked and
 * a new one issued in its place, so a token is single-use. If a token
 * that was already revoked (i.e. already used once, or explicitly logged
 * out) is presented again, that's a signal it leaked -- every other
 * active refresh token for the same user is revoked too, forcing a fresh
 * login everywhere.
 */
export async function rotateRefreshToken(rawToken: string): Promise<RefreshResult> {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.mobileRefreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return { ok: false, reason: "invalid" };

  if (existing.revokedAt) {
    await prisma.mobileRefreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: false, reason: "revoked" };
  }

  if (existing.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  const newRaw = randomBytes(48).toString("base64url");
  const newHash = hashToken(newRaw);

  await prisma.$transaction([
    prisma.mobileRefreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newHash },
    }),
    prisma.mobileRefreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: newHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }),
  ]);

  return { ok: true, userId: existing.userId, refreshToken: newRaw };
}

/** Revokes a single refresh token (logout on one device). Silently no-ops if it's already gone/revoked. */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.mobileRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
