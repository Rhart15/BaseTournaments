import { NextRequest, NextResponse } from "next/server";
import { guardRegistration } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Deliberately narrow: only the two transitions the Divisions-tab waitlist
// panel needs. Every other status change (PAID, REFUNDED, CANCELLED) has
// its own dedicated flow with real side effects (Stripe charges/refunds --
// see src/lib/refunds.ts) and must not go through this generic route.
const ALLOWED: Record<string, string[]> = {
  WAITLISTED: ["PENDING", "PAID"],
  PENDING: ["WAITLISTED"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardRegistration(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { status: nextStatus } = await req.json();
  if (typeof nextStatus !== "string" || !ALLOWED[nextStatus]) {
    return NextResponse.json({ error: "Unsupported status transition." }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
  if (!ALLOWED[nextStatus].includes(registration.status)) {
    return NextResponse.json(
      { error: `Can't move a ${registration.status} registration to ${nextStatus}.` },
      { status: 400 }
    );
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      status: nextStatus as "WAITLISTED" | "PENDING",
      waitlistedAt: nextStatus === "WAITLISTED" ? new Date() : null,
    },
  });

  return NextResponse.json({ registration: updated });
}
