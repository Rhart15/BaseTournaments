import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/adminAuth";
import { refreshConnectStatus } from "@/lib/connect";

// Pulls the admin's live Connect account state from Stripe and caches it
// on their user row. Called after they return from onboarding.
export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  try {
    const status = await refreshConnectStatus(g.session.user.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("Connect status refresh failed:", err);
    return NextResponse.json({ error: "Couldn't reach Stripe." }, { status: 502 });
  }
}
