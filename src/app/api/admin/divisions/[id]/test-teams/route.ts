import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const NAME_PARTS = [
  "Thunder",
  "Rattlers",
  "Wildcats",
  "Bandits",
  "Comets",
  "Hornets",
  "Grizzlies",
  "Outlaws",
  "Cyclones",
  "Renegades",
  "Wolves",
  "Vipers",
];

// Admin-only convenience for testing pool play / bracket flow without
// running real registrations through Stripe checkout. Creates N fake,
// already-PAID registrations for a division.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: divisionId } = await params;
  const body = await req.json().catch(() => ({}));
  const count = Math.max(1, Math.min(32, Number(body.count) || 1));

  const division = await prisma.division.findUnique({
    where: { id: divisionId },
  });
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  const created = [];
  for (let i = 0; i < count; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const teamName = `Test ${NAME_PARTS[i % NAME_PARTS.length]} ${suffix}`;
    const reg = await prisma.registration.create({
      data: {
        tournamentId: division.tournamentId,
        divisionId,
        teamName,
        coachName: "Test Coach",
        coachEmail: `test-${suffix}@example.com`,
        coachPhone: "5015550100",
        status: "PAID",
        paidAt: new Date(),
      },
    });
    created.push(reg.teamName);
  }

  return NextResponse.json({ ok: true, created });
}
