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

  const { id: divisionId } = await params;
  const body = await req.json();
  const published = Boolean(body.published);

  const division = await prisma.division.update({
    where: { id: divisionId },
    data: { bracketPublished: published },
  });

  return NextResponse.json({ division });
}
