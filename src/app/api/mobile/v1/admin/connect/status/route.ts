import { NextRequest, NextResponse } from "next/server";
import { getMobileAdminSession } from "@/lib/mobileAuth";
import { guardAdmin } from "@/lib/adminAuth";
import { refreshConnectStatus } from "@/lib/connect";

export const dynamic = "force-dynamic";

// Read-only payout/Connect status -- the mobile equivalent of
// /api/admin/connect/status. Onboarding itself (the hosted Stripe flow)
// stays web-only for v1; this just answers "am I set up to get paid."
export async function GET(req: NextRequest) {
  const mobileSession = await getMobileAdminSession(req);
  const g = await guardAdmin(mobileSession);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  try {
    const status = await refreshConnectStatus(g.session.user.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("Mobile Connect status refresh failed:", err);
    return NextResponse.json({ error: "Couldn't reach Stripe." }, { status: 502 });
  }
}
