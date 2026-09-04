import { NextRequest, NextResponse } from "next/server";
import { canManageTeam } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canManageTeam(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, ageGroup, homeCity, homeState, organization } = body;

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(ageGroup !== undefined && { ageGroup }),
      ...(homeCity !== undefined && { homeCity }),
      ...(homeState !== undefined && { homeState }),
      ...(organization !== undefined && { organization }),
    },
  });

  return NextResponse.json({ team });
}
