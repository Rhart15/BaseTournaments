import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function loadValidInvite(token: string) {
  const invite = await prisma.guestPlayerInvite.findUnique({
    where: { token },
    include: {
      registration: { include: { tournament: true, division: true } },
    },
  });
  if (!invite) return { invite: null, error: "This link isn't valid." };
  if (invite.usedAt) return { invite: null, error: "This link has already been used." };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { invite: null, error: "This link has expired." };
  }
  return { invite, error: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { invite, error } = await loadValidInvite(token);
  if (!invite) {
    return NextResponse.json({ error }, { status: 404 });
  }
  return NextResponse.json({
    teamName: invite.registration.teamName,
    tournamentName: invite.registration.tournament.name,
    division: invite.registration.division.label,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { invite, error } = await loadValidInvite(token);
  if (!invite) {
    return NextResponse.json({ error }, { status: 404 });
  }

  const body = await req.json();
  const { firstName, lastName, jerseyNumber, position } = body;
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 }
    );
  }

  const player = await prisma.rosterPlayer.create({
    data: {
      registrationId: invite.registrationId,
      firstName,
      lastName,
      jerseyNumber: jerseyNumber || null,
      position: position || null,
      isGuest: true,
    },
  });

  await prisma.guestPlayerInvite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ player });
}
