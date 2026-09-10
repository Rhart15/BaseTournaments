import { NextRequest, NextResponse } from "next/server";
import { guardLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { resetAccountPassword } from "@/lib/adminAccounts";

// Lead admin resets another admin's password to a fresh temporary one,
// shown once so they can pass it along.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const g = await guardLeadAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const { userId } = await params;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Not an admin account." }, { status: 404 });
  }

  const tempPassword = await resetAccountPassword(userId);
  return NextResponse.json({ tempPassword });
}
