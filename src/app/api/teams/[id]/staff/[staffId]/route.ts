import { NextRequest, NextResponse } from "next/server";
import { canManageTeam } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await params;
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await prisma.teamStaff.findUnique({ where: { id: staffId } });
  if (!staff || staff.teamId !== id) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 }
    );
  }

  await prisma.teamStaff.delete({ where: { id: staffId } });
  return NextResponse.json({ ok: true });
}
