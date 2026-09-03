import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, birthYear } = body;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 }
    );
  }

  const athlete = await prisma.familyAthlete.create({
    data: {
      parentId: session.user.id,
      firstName,
      lastName,
      birthYear: birthYear ? Number(birthYear) : null,
    },
  });

  return NextResponse.json({ athlete });
}
