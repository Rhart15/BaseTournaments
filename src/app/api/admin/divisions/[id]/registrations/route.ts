import { NextResponse } from "next/server";
import { guardDivision } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Backs the Divisions-tab waitlist panel: every non-cancelled/refunded
// registration in this division, so an admin can move one to WAITLISTED or
// invite a waitlisted one back in.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardDivision(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const registrations = await prisma.registration.findMany({
    where: { divisionId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    select: { id: true, teamName: true, coachName: true, status: true, waitlistedAt: true },
    orderBy: [{ status: "asc" }, { waitlistedAt: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ registrations });
}
