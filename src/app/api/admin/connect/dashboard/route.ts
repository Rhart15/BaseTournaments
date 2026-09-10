import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { createDashboardLink } from "@/lib/connect";

// A short-lived link into the admin's Stripe Express dashboard (payout
// history, bank details, etc.).
export async function POST() {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const user = await prisma.user.findUnique({
    where: { id: g.session.user.id },
    select: { stripeConnectAccountId: true },
  });
  if (!user?.stripeConnectAccountId) {
    return NextResponse.json(
      { error: "You haven't set up Stripe payouts yet." },
      { status: 400 }
    );
  }

  try {
    const url = await createDashboardLink(user.stripeConnectAccountId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Connect dashboard link failed:", err);
    return NextResponse.json(
      { error: "Couldn't open the Stripe dashboard. Finish onboarding first, then try again." },
      { status: 502 }
    );
  }
}
