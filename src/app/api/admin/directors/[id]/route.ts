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
  const { backgroundCheckStatus, sanctionFeePaid } = body;

  const director = await prisma.director.update({
    where: { id },
    data: {
      ...(backgroundCheckStatus !== undefined && { backgroundCheckStatus }),
      ...(sanctionFeePaid !== undefined && { sanctionFeePaid }),
    },
  });

  return NextResponse.json({ director });
}
