import { NextRequest, NextResponse } from "next/server";
import { guardDivision } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: divisionId } = await params;

  const g = await guardDivision(divisionId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const body = await req.json();
  const published = Boolean(body.published);

  const division = await prisma.division.update({
    where: { id: divisionId },
    data: { bracketPublished: published },
  });

  return NextResponse.json({ division });
}
