import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMobileAdminSession } from "@/lib/mobileAuth";
import { guardGame } from "@/lib/adminAuth";
import { applyGameScore } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const scoreSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

// Score entry from the field -- the mobile equivalent of
// /api/games/[id]/score, and the reason score entry made the v1 cut:
// this is the one admin action that's genuinely more useful on a phone
// standing at a field than at a desk. Same guardGame ownership check and
// the exact same standings/bracket-advancement logic (src/lib/scoring.ts)
// as the website route -- nothing about scoring behaves differently
// depending on which client entered it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mobileSession = await getMobileAdminSession(req);
  const g = await guardGame(id, mobileSession);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json().catch(() => null);
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  const game = await applyGameScore(id, parsed.data.homeScore, parsed.data.awayScore);
  return NextResponse.json({ game });
}
