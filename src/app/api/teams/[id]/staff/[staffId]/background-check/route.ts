import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { canManageTeam } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const { id, staffId } = await params;
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await prisma.teamStaff.findUnique({ where: { id: staffId } });
  if (!staff || staff.teamId !== id) {
    return NextResponse.json(
      { error: "Staff member not found." },
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
      { error: "Only PDF, JPG, or PNG files are allowed." },
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
    `background-checks/staff-${staffId}-${Date.now()}.${extension}`,
    file,
    { access: "public" }
  );

  const updated = await prisma.teamStaff.update({
    where: { id: staffId },
    data: {
      backgroundCheckFileUrl: blob.url,
      backgroundCheckFileName: file.name,
      backgroundCheckStatus: "SUBMITTED",
    },
  });

  return NextResponse.json({ staff: updated });
}
