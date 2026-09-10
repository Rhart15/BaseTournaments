import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/adminAuth";
import { getOrCreateConnectAccount, createOnboardingLink } from "@/lib/connect";

// Kicks off (or resumes) Stripe Connect onboarding for the logged-in
// admin. Returns a one-time Stripe-hosted URL to redirect them to.
export async function POST() {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  try {
    const accountId = await getOrCreateConnectAccount(g.session.user.id);
    const url = await createOnboardingLink(accountId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Connect onboarding start failed:", err);
    return NextResponse.json(
      { error: "Couldn't start Stripe onboarding right now. Try again shortly." },
      { status: 502 }
    );
  }
}
