import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const label = formData.get("label");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was uploaded." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File must be under 10MB." },
      { status: 400 }
    );
  }

  const extension = file.name.split(".").pop() || "pdf";
  const blob = await put(
    `team-documents/${id}-${Date.now()}.${extension}`,
    file,
    { access: "public" }
  );

  const document = await prisma.teamDocument.create({
    data: {
      teamId: id,
      label: (label as string) || file.name,
      fileUrl: blob.url,
      fileName: file.name,
    },
  });

  return NextResponse.json({ document });
}
