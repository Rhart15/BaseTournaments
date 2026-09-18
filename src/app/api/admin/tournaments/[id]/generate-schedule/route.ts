import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardTournament } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import {
  generateSchedule,
  DEFAULT_GAME_MINUTES,
  DEFAULT_BREAK_MINUTES,
  type ScheduleGame,
  type FieldResource,
} from "@/lib/scheduleGenerator";

const bodySchema = z.object({
  mode: z.enum(["fill", "regenerate"]).default("fill"),
  includeLocked: z.boolean().default(false),
});

const DEFAULT_DAILY_START = "08:00";
const DEFAULT_DAILY_END = "20:00";

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
}

// Runs the schedule generator (src/lib/scheduleGenerator.ts) over every
// game in the tournament and persists the result. Never creates, deletes,
// or re-pairs games -- only assigns venue/field/start time to games that
// already exist (from the pool-schedule/bracket generators).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  const g = await guardTournament(tournamentId);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { mode, includeLocked } = parsed.data;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      venue: true,
      tournamentVenues: { include: { venue: true } },
      divisions: {
        orderBy: { sortOrder: "asc" },
        include: { games: true },
      },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Prefer the explicit multi-venue list; fall back to the legacy single
  // venue so a tournament that's never used the picker still works.
  const venues =
    tournament.tournamentVenues.length > 0
      ? tournament.tournamentVenues.map((tv) => tv.venue)
      : tournament.venue
      ? [tournament.venue]
      : [];

  if (venues.length === 0) {
    return NextResponse.json(
      { error: "This tournament has no venues attached yet -- add at least one on the Schedule tab first." },
      { status: 400 }
    );
  }

  const venueById = new Map(venues.map((v) => [v.id, v]));
  const fields: FieldResource[] = [];
  for (const v of venues) {
    for (let n = 1; n <= v.fieldCount; n++) fields.push({ venueId: v.id, fieldNumber: n });
  }

  const scheduleGames: ScheduleGame[] = [];
  for (const division of tournament.divisions) {
    const durationMinutes =
      (division.gameTimeLimitMinutes ?? DEFAULT_GAME_MINUTES) +
      (division.breakMinutes ?? DEFAULT_BREAK_MINUTES);
    for (const game of division.games) {
      scheduleGames.push({
        id: game.id,
        divisionId: division.id,
        divisionSortOrder: division.sortOrder,
        durationMinutes,
        stage: game.stage,
        round: game.round,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        advancesToGameId: game.advancesToGameId,
        loserAdvancesToGameId: game.loserAdvancesToGameId,
        venueId: game.venueId,
        fieldNumber: game.fieldNumber,
        startTime: game.startTime,
        scheduleLocked: game.scheduleLocked,
      });
    }
  }

  if (scheduleGames.length === 0) {
    return NextResponse.json(
      { error: "No games exist yet -- generate pool schedules/brackets for each division first." },
      { status: 400 }
    );
  }

  const result = generateSchedule({
    games: scheduleGames,
    fields,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    dailyStartMinutes: parseHHMM(tournament.dailyStartTime || DEFAULT_DAILY_START),
    dailyEndMinutes: parseHHMM(tournament.dailyEndTime || DEFAULT_DAILY_END),
    stepMinutes: tournament.scheduleIntervalMinutes || 30,
    maxGamesPerDay: tournament.maxGamesPerDay,
    mode,
    includeLocked,
  });

  await prisma.$transaction(
    result.assignments.map((a) => {
      const venue = venueById.get(a.venueId)!;
      const fieldName = venue.fieldCount > 1 ? `${venue.name} — Field ${a.fieldNumber}` : venue.name;
      return prisma.game.update({
        where: { id: a.gameId },
        data: {
          venueId: a.venueId,
          fieldNumber: a.fieldNumber,
          startTime: a.startTime,
          fieldName,
          scheduleLocked: false,
        },
      });
    })
  );

  return NextResponse.json({
    ok: true,
    scheduledCount: result.scheduledCount,
    keptCount: result.keptCount,
    overflowCount: result.overflowCount,
  });
}
