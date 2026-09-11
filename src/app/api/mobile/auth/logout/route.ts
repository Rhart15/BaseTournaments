import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revokeRefreshToken } from "@/lib/mobileAuth";

const logoutSchema = z.object({ refreshToken: z.string().min(1) });

// Revokes one refresh token (logs out this device only). The access
// token itself can't be revoked early -- it's stateless and just expires
// on its own in 15 minutes, same tradeoff every short-lived-JWT design
// makes.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = logoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "refreshToken is required." }, { status: 400 });
  }

  await revokeRefreshToken(parsed.data.refreshToken);
  return NextResponse.json({ ok: true });
}
