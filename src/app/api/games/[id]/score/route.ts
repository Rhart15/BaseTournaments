import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardGame } from "@/lib/adminAuth";
import { applyGameScore } from "@/lib/scoring";

const scoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

// Score entry -- restricted to an admin who owns the tournament this
// game belongs to (a lead admin owns every tournament). The actual
// standings/advancement logic lives in src/lib/scoring.ts, shared with
// the mobile equivalent of this route.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardGame(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const parsed = scoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const game = await applyGameScore(id, parsed.data.homeScore, parsed.data.awayScore);
  return NextResponse.json({ game });
}
