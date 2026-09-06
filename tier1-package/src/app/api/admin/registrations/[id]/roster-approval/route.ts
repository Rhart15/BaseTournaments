import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
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
