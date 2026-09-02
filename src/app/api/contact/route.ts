import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, phone, subject, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  await prisma.contactSubmission.create({
    data: { name, email, phone, subject, message },
  });

  // Note: this saves the submission to the admin inbox but does not yet
  // send an email notification. Flagged as a known limitation.
  return NextResponse.json({ ok: true });
}
