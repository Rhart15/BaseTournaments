import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, signAccessToken, issueRefreshToken } from "@/lib/mobileAuth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Mobile-only login: same User table and bcrypt password check the
// website's NextAuth Credentials provider uses (src/auth.ts), but issues
// a bearer access + refresh token pair instead of a session cookie.
// Intentionally its own endpoint, not a NextAuth provider -- keeps the
// web login flow completely untouched.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await verifyPassword(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user),
    issueRefreshToken(user.id),
  ]);

  return NextResponse.json({ accessToken, refreshToken, user });
}
