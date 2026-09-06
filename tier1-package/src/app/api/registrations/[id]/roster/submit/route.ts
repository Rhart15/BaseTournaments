import { NextResponse } from "next/server";
import { canManageRegistration } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canManageRegistration(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { rosterPlayers: true },
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }
  if (registration.rosterPlayers.length === 0) {
    return NextResponse.json(
      { error: "Add at least one player before submitting the roster." },
      { status: 400 }
    );
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      rosterApprovalStatus: "SUBMITTED",
      rosterSubmittedAt: new Date(),
    },
  });

  return NextResponse.json({ registration: updated });
}
