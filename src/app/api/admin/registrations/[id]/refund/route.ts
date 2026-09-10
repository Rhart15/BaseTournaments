import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardRegistration } from "@/lib/adminAuth";
import { refundPreview, refundRegistration } from "@/lib/refunds";

// GET  -> what a refund of this registration would involve (for the modal)
// POST -> actually issue the refund
//
// Access: a lead admin, or the admin who owns this registration's
// tournament (guardRegistration enforces both).

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await guardRegistration(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const preview = await refundPreview(id);
  if (!preview) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  return NextResponse.json(preview);
}

const bodySchema = z.object({
  // omitted / null = full refund
  amountCents: z.number().int().positive().nullish(),
  reason: z.string().max(500).nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await guardRegistration(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refund request." }, { status: 400 });
  }

  const result = await refundRegistration({
    registrationId: id,
    amountCents: parsed.data.amountCents ?? null,
    reason: parsed.data.reason ?? null,
    actorUserId: g.session.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, note: result.note }, { status: 400 });
  }
  return NextResponse.json(result);
}
