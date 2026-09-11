import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getMobileSession } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

const joinSchema = z.object({ athleteName: z.string().trim().min(1).max(200).optional() });

// Mobile-only: a logged-in parent links their account to a team by
// opening the same /teams/[id]/join link a coach already copies and
// shares from the Team Manage page on the website. Separate from (and
// doesn't touch) the existing public web route at that same path, which
// stays a no-login "add a player to the roster" form. This one creates
// an account-level TeamParent link instead, granting read access to the
// team's schedule/standings/registration status in the app.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PARENT") {
    return NextResponse.json(
      { error: "Only a parent account can join a team this way." },
      { status: 403 }
    );
  }

  const team = await prisma.team.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const link = await prisma.teamParent.upsert({
    where: { teamId_userId: { teamId: id, userId: session.user.id } },
    update: { athleteName: parsed.data.athleteName ?? undefined },
    create: {
      teamId: id,
      userId: session.user.id,
      athleteName: parsed.data.athleteName ?? null,
    },
  });

  return NextResponse.json({ team, link: { id: link.id, athleteName: link.athleteName } });
}
