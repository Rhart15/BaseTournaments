import { NextRequest, NextResponse } from "next/server";
import { guardAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Reusable master list of subdivision (skill-level) labels, shared across
// every event -- picked from when building a Division row in the wizard.
export async function GET() {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const options = await prisma.subdivisionOption.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ options });
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { label } = await req.json();
  if (!label || !String(label).trim()) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }

  const count = await prisma.subdivisionOption.count();
  const option = await prisma.subdivisionOption.upsert({
    where: { label: String(label).trim() },
    update: {},
    create: { label: String(label).trim(), sortOrder: count },
  });

  return NextResponse.json({ option });
}
