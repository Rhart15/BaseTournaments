import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rotateRefreshToken, signAccessToken } from "@/lib/mobileAuth";

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

// Exchanges a refresh token for a new access token, rotating the refresh
// token in the same call (single-use). A stolen-and-replayed refresh
// token is detected here (see rotateRefreshToken) and revokes every
// active refresh token for that user, forcing a re-login everywhere.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "refreshToken is required." }, { status: 400 });
  }

  const result = await rotateRefreshToken(parsed.data.refreshToken);
  if (!result.ok) {
    return NextResponse.json({ error: "Session expired, please log in again." }, { status: 401 });
  }

  // Re-read the user rather than trusting anything cached client-side --
  // role/isSuperAdmin may have changed since the last login, and this is
  // the one moment we can cheaply pick that up.
  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) {
    return NextResponse.json({ error: "Account no longer exists." }, { status: 401 });
  }

  const accessToken = await signAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  });

  return NextResponse.json({ accessToken, refreshToken: result.refreshToken });
}
