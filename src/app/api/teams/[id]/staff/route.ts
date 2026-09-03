import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, role, phone, email, isHousingContact } = body;

  if (!name || !role) {
    return NextResponse.json(
      { error: "Name and role are required." },
      { status: 400 }
    );
  }

  const staff = await prisma.teamStaff.create({
    data: {
      teamId: id,
      name,
      role,
      phone: phone || null,
      email: email || null,
      isHousingContact: Boolean(isHousingContact),
    },
  });

  return NextResponse.json({ staff });
}
