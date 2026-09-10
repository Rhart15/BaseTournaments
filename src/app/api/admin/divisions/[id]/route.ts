import { NextRequest, NextResponse } from "next/server";
import { guardDivision } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardDivision(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const { label, teamCap } = body;

  const division = await prisma.division.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(teamCap !== undefined && {
        teamCap: teamCap === null || teamCap === "" ? null : Number(teamCap),
      }),
    },
  });

  return NextResponse.json({ division });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardDivision(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  await prisma.division.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
