import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { createAdminAccount } from "@/lib/adminAccounts";

// All admin management is lead-admin only.

export async function GET() {
  const g = await guardLeadAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      mustChangePassword: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      stripeConnectDetailsSubmitted: true,
      stripeConnectAccountId: true,
      _count: { select: { ownedTournaments: true } },
    },
  });

  return NextResponse.json({ admins });
}

const createSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    name: z.string().min(2, "Name is required."),
    email: z.string().email("A valid email is required."),
    isSuperAdmin: z.boolean().optional(),
  }),
  z.object({
    mode: z.literal("promote"),
    email: z.string().email("A valid email is required."),
    isSuperAdmin: z.boolean().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const g = await guardLeadAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (parsed.data.mode === "promote") {
    if (!existing) {
      return NextResponse.json(
        { error: "No account with that email. Use “Create admin” to make one." },
        { status: 404 }
      );
    }
    if (existing.role === "ADMIN") {
      return NextResponse.json({ error: "That account is already an admin." }, { status: 409 });
    }
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", isSuperAdmin: Boolean(parsed.data.isSuperAdmin) },
      select: { id: true, name: true, email: true, isSuperAdmin: true },
    });
    return NextResponse.json({ user });
  }

  // create
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists — promote it instead." },
      { status: 409 }
    );
  }
  const { user, tempPassword } = await createAdminAccount({
    name: parsed.data.name,
    email,
    isSuperAdmin: parsed.data.isSuperAdmin,
  });
  return NextResponse.json({ user, tempPassword });
}
