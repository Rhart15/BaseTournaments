import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const scheduleSchema = z.object({
  fieldName: z.string().nullable().optional(),
  // ISO datetime string, or null to clear it.
  startTime: z.string().nullable().optional(),
});

// Sets the field and start time on a game -- kept separate from the
// score route so the admin can schedule a game before it's been played.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const game = await prisma.game.update({
    where: { id },
    data: { fieldName, startTime },
  });

  return NextResponse.json({ game });
}
