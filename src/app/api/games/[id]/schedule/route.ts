import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardGame } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

const scheduleSchema = z.object({
  fieldName: z.string().nullable().optional(),
  // ISO datetime string, or null to clear it.
  startTime: z.string().nullable().optional(),
  // Structured venue/field, set by the Schedule tab's editor. Optional so
  // the free-text-only callers (ScoreEntry's plain field/time inputs)
  // keep working unchanged.
  venueId: z.string().nullable().optional(),
  fieldNumber: z.number().int().min(1).nullable().optional(),
});

// Sets the field and start time on a game -- kept separate from the
// score route so the admin can schedule a game before it's been played.
// Any call here is a manual admin edit, so it always locks the game
// against the bulk schedule generator (see Game.scheduleLocked) --
// the generator itself writes directly via Prisma, never through this
// route, so that invariant holds.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardGame(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
  }

  const fieldName =
    parsed.data.fieldName === undefined
      ? undefined
      : parsed.data.fieldName?.trim() || null;

  const startTime =
    parsed.data.startTime === undefined
      ? undefined
      : parsed.data.startTime
      ? new Date(parsed.data.startTime)
      : null;

  if (startTime !== undefined && startTime !== null && isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const venueId = parsed.data.venueId === undefined ? undefined : parsed.data.venueId;
  const fieldNumber = parsed.data.fieldNumber === undefined ? undefined : parsed.data.fieldNumber;

  const game = await prisma.game.update({
    where: { id },
    data: { fieldName, startTime, venueId, fieldNumber, scheduleLocked: true },
  });

  return NextResponse.json({ game });
}
