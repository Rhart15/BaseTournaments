import { NextRequest, NextResponse } from "next/server";
import { guardAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

// Shared master data (like Director/DiscountCode), not owned by a single
// tournament -- any admin can manage it, same as those.
export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const { name, address, city, state, fieldCount } = body;

  if (!name || !String(name).trim() || !address || !String(address).trim() || !city || !String(city).trim()) {
    return NextResponse.json({ error: "Name, address, and city are required." }, { status: 400 });
  }
  const fields = Number(fieldCount);
  if (!Number.isFinite(fields) || fields < 1) {
    return NextResponse.json({ error: "Field count must be at least 1." }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: {
      name: String(name).trim(),
      address: String(address).trim(),
      city: String(city).trim(),
      state: state ? String(state).trim() : "AR",
      fieldCount: Math.round(fields),
    },
  });

  return NextResponse.json({ venue });
}
