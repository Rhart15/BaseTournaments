import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { guardTournament } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found." },
      { status: 404 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was uploaded." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, or WebP images are allowed." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 5MB." },
      { status: 400 }
    );
  }

  const extension = file.name.split(".").pop() || "jpg";
  const blob = await put(
    `tournament-logos/${id}-${Date.now()}.${extension}`,
    file,
    { access: "public" }
  );

  await prisma.tournament.update({
    where: { id },
    data: { logoUrl: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  await prisma.tournament.update({
    where: { id },
    data: { logoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
