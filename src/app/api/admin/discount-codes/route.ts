import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { code, type, value, maxUses, expiresAt } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "A code is required." }, { status: 400 });
  }
  if (type !== "PERCENT" && type !== "FLAT") {
    return NextResponse.json({ error: "Type must be PERCENT or FLAT." }, { status: 400 });
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return NextResponse.json({ error: "Value must be a positive number." }, { status: 400 });
  }

  try {
    const created = await prisma.discountCode.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        // FLAT values are entered in dollars by the admin, stored in cents.
        value: type === "FLAT" ? Math.round(numericValue * 100) : Math.round(numericValue),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return NextResponse.json({ code: created });
  } catch {
    return NextResponse.json(
      { error: "That code already exists." },
      { status: 409 }
    );
  }
}
