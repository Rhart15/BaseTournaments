import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, name, phone, role } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json(
      { error: "Name, email, password, and account type are required." },
      { status: 400 }
    );
  }

  if (!["COACH", "PARENT"].includes(role)) {
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone: phone || null,
      role,
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
