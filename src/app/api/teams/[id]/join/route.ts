import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Intentionally public: a coach copies this team's /join link and
// shares it with parents so they can add their own athlete to the
// roster without needing a login. Not gated by canManageTeam -- that
// would break the feature, since the person submitting isn't the coach.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }

  const body = await req.json();
  const { firstName, lastName, jerseyNumber, position, birthYear } = body;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 }
    );
  }

  const player = await prisma.player.create({
    data: {
      teamId: id,
      firstName,
      lastName,
      jerseyNumber: jerseyNumber || null,
      position: position || null,
      birthYear: birthYear ? Number(birthYear) : null,
    },
  });

  return NextResponse.json({ player });
}
