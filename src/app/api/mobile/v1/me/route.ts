import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

// Whoever the bearer access token belongs to. Cheap: reads straight off
// the verified token, no DB call.
export async function GET(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: session.user });
}
