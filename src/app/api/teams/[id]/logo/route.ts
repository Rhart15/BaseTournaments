import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { canManageTeam } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
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
    `team-logos/${id}-${Date.now()}.${extension}`,
    file,
    { access: "public" }
  );

  await prisma.team.update({
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
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.team.update({
    where: { id },
    data: { logoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
