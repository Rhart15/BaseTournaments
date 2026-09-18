import { NextRequest, NextResponse } from "next/server";
import { guardCustomButton } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardCustomButton(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { text, url } = await req.json();

  const button = await prisma.eventCustomButton.update({
    where: { id },
    data: {
      ...(text !== undefined && { text: String(text).trim() }),
      ...(url !== undefined && { url: String(url).trim() }),
    },
  });

  return NextResponse.json({ button });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardCustomButton(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  await prisma.eventCustomButton.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
