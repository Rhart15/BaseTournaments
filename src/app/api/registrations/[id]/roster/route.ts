import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const players = await prisma.rosterPlayer.findMany({
    where: { registrationId: id },
    orderBy: { lastName: "asc" },
  });
  return NextResponse.json({ players });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { firstName, lastName, jerseyNumber, position } = body;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 }
    );
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
  });
  if (!registration) {
    return NextResponse.json(
      { error: "Registration not found." },
      { status: 404 }
    );
  }

  const player = await prisma.rosterPlayer.create({
    data: {
      registrationId: id,
      firstName,
      lastName,
      jerseyNumber: jerseyNumber || null,
      position: position || null,
    },
  });

  return NextResponse.json({ player });
}