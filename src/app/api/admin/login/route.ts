import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAdminSession } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!checkPassword(password ?? "")) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ ok: true });
}
