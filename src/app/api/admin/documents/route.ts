import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const documents = await prisma.siteDocument.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const label = formData.get("label");
  const category = formData.get("category");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (!label || typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "A label is required." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPG, or PNG files are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 15MB." }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "pdf";
  const blob = await put(
    `site-documents/${Date.now()}-${label.trim().replace(/\s+/g, "-")}.${extension}`,
    file,
    { access: "public" }
  );

  const document = await prisma.siteDocument.create({
    data: {
      label: label.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : "General",
      fileUrl: blob.url,
      fileName: file.name,
    },
  });

  return NextResponse.json({ document });
}
