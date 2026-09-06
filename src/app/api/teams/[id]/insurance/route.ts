import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { canManageTeam } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// A coach uploads their team's proof-of-insurance here. This sets the
// status to SUBMITTED -- an admin still has to review the file and move
// it to APPROVED (or back to PENDING/EXPIRED) from the admin team list.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    `insurance/team-${id}-${Date.now()}.${extension}`,
    file,
    { access: "public" }
  );

  const team = await prisma.team.update({
    where: { id },
    data: {
      insuranceFileUrl: blob.url,
      insuranceFileName: file.name,
      insuranceStatus: "SUBMITTED",
    },
  });

  return NextResponse.json({ team });
}
