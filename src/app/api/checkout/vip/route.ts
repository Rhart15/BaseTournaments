import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkDivisionCapacity } from "@/lib/divisionCapacity";

const vipRegisterSchema = z.object({
  tournamentId: z.string(),
  divisionId: z.string(),
  teamName: z.string().min(2),
  coachName: z.string().min(2),
  coachEmail: z.string().email(),
  coachPhone: z.string().min(7),
  vipCode: z.string().min(1),
});

// A separate, code-gated path for comping a registration (sponsors,
// invited teams, staff, etc.) without a real Stripe charge. The code
// is a private secret only Ray hands out -- it is never accepted from
// a client-visible default and is compared server-side only, so this
// can't become a generic "skip payment" button for the public.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = vipRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration details", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    tournamentId,
    divisionId,
    teamName,
    coachName,
    coachEmail,
    coachPhone,
    vipCode,
  } = parsed.data;

  if (!process.env.VIP_ACCESS_CODE || vipCode !== process.env.VIP_ACCESS_CODE) {
    return NextResponse.json({ error: "Invalid VIP code" }, { status: 401 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const registeredCount = await prisma.registration.count({
    where: { tournamentId, status: { in: ["PAID", "PENDING"] } },
  });
  if (registeredCount >= tournament.teamCap) {
    return NextResponse.json(
      { error: "This tournament is full" },
      { status: 409 }
    );
  }

  const capacity = await checkDivisionCapacity(tournamentId, divisionId);
  if (!capacity.ok) {
    return NextResponse.json({ error: capacity.error }, { status: capacity.httpStatus });
  }

  const authSession = await auth();
  let ownTeamId: string | null = null;
  if (authSession?.user?.id) {
    const ownTeam = await prisma.team.findFirst({
      where: { coachUserId: authSession.user.id },
      select: { id: true },
    });
    ownTeamId = ownTeam?.id ?? null;
  }

  // A VIP code still respects division capacity/waitlist like every other
  // checkout path -- no bypass, by explicit decision.
  const registration = await prisma.registration.create({
    data: {
      tournamentId,
      divisionId,
      teamName,
      coachName,
      coachEmail,
      coachPhone,
      teamId: ownTeamId,
      isVipComp: true,
      ...(capacity.waitlist
        ? { status: "WAITLISTED", waitlistedAt: new Date() }
        : { status: "PAID", paidAt: new Date() }),
    },
  });

  return NextResponse.json({
    registrationId: registration.id,
    ...(capacity.waitlist ? { waitlisted: true } : {}),
  });
}
