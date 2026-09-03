import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { label } = body;

  if (!label || !label.trim()) {
    return NextResponse.json(
      { error: "Division label is required." },
      { status: 400 }
    );
  }

  const division = await prisma.division.create({
    data: { tournamentId: id, label: label.trim() },
  });

  return NextResponse.json({ division });
}
