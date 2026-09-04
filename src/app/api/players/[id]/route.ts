import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { firstName, lastName, jerseyNumber, position, birthYear } = body;

  const player = await prisma.player.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(jerseyNumber !== undefined && { jerseyNumber: jerseyNumber || null }),
      ...(position !== undefined && { position: position || null }),
      ...(birthYear !== undefined && {
        birthYear: birthYear ? Number(birthYear) : null,
      }),
    },
  });

  return NextResponse.json({ player });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.player.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
