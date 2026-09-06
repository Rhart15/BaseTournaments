import { NextResponse } from "next/server";
import { canManageRegistration } from "@/lib/teamAuth";
import { prisma } from "@/lib/db";

// Coach (or admin) generates a link they can text/email to a guest
// player's parent, letting that person add the player to this specific
// tournament's roster without needing an account.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await canManageRegistration(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registration = await prisma.registration.findUnique({ where: { id } });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  // 14 days is plenty for a single tournament's registration window.
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const invite = await prisma.guestPlayerInvite.create({
    data: { registrationId: id, expiresAt },
  });

  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/guest-players/${invite.token}`;
  return NextResponse.json({ url, expiresAt: invite.expiresAt });
}
