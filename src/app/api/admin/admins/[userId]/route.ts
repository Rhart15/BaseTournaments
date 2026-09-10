import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

async function leadAdminCount(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", isSuperAdmin: true } });
}

const patchSchema = z.object({
  isSuperAdmin: z.boolean(),
});

// Toggle lead-admin status for another admin.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const g = await guardLeadAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { userId } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Not an admin account." }, { status: 404 });
  }

  if (!parsed.data.isSuperAdmin && target.isSuperAdmin && (await leadAdminCount()) <= 1) {
    return NextResponse.json(
      { error: "There has to be at least one lead admin." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: parsed.data.isSuperAdmin },
    select: { id: true, name: true, email: true, isSuperAdmin: true },
  });
  return NextResponse.json({ user });
}

// Remove admin access (demote to COACH). Tournaments they own must be
// reassigned first -- pass ?reassignTo=<adminUserId> to move them all in
// the same call.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const g = await guardLeadAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { userId } = await params;
  if (userId === g.session.user.id) {
    return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { ownedTournaments: true } } },
  });
  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Not an admin account." }, { status: 404 });
  }
  if (target.isSuperAdmin && (await leadAdminCount()) <= 1) {
    return NextResponse.json(
      { error: "There has to be at least one lead admin." },
      { status: 400 }
    );
  }

  const reassignTo = req.nextUrl.searchParams.get("reassignTo");
  if (target._count.ownedTournaments > 0) {
    if (!reassignTo) {
      return NextResponse.json(
        {
          error: `This admin owns ${target._count.ownedTournaments} tournament(s). Choose someone to reassign them to first.`,
          needsReassign: true,
          ownedCount: target._count.ownedTournaments,
        },
        { status: 409 }
      );
    }
    const newOwner = await prisma.user.findUnique({ where: { id: reassignTo } });
    if (!newOwner || newOwner.role !== "ADMIN") {
      return NextResponse.json({ error: "The reassignment target isn't an admin." }, { status: 400 });
    }
    await prisma.tournament.updateMany({
      where: { ownerId: userId },
      data: { ownerId: reassignTo },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "COACH", isSuperAdmin: false },
  });

  return NextResponse.json({ ok: true });
}
