import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, ageGroup, organization, homeCity, homeState, directorId } = body;

  if (!name || !ageGroup) {
    return NextResponse.json(
      { error: "Team name and age group are required" },
      { status: 400 }
    );
  }

  const team = await prisma.team.create({
    data: {
      name,
      ageGroup,
      organization: organization || null,
      homeCity: homeCity || null,
      homeState: homeState || "AR",
      directorId: directorId || null,
    },
  });

  return NextResponse.json({ team });
}
