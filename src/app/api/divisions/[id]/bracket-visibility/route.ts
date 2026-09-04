import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: divisionId } = await params;
  const body = await req.json();
  const published = Boolean(body.published);

  const division = await prisma.division.update({
    where: { id: divisionId },
    data: { bracketPublished: published },
  });

  return NextResponse.json({ division });
}
