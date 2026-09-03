import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, ageGroup, homeCity, homeState } = body;

  if (!name || !ageGroup) {
    return NextResponse.json(
      { error: "Team name and division are required." },
      { status: 400 }
    );
  }

  const team = await prisma.team.create({
    data: {
      name,
      ageGroup,
      homeCity: homeCity || null,
      homeState: homeState || "AR",
      coachUserId: session.user.id,
    },
  });

  return NextResponse.json({ team });
}
