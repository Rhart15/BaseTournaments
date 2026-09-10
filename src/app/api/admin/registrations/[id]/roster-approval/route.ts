import { NextRequest, NextResponse } from "next/server";
import { guardRegistration } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardRegistration(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const body = await req.json();
  const { rosterApprovalStatus, rosterReviewNote } = body;

  const registration = await prisma.registration.update({
    where: { id },
    data: {
      ...(rosterApprovalStatus !== undefined && { rosterApprovalStatus }),
      ...(rosterReviewNote !== undefined && { rosterReviewNote: rosterReviewNote || null }),
      rosterReviewedAt: new Date(),
    },
  });

  return NextResponse.json({ registration });
}
