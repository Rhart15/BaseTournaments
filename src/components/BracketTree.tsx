"use client";

import { useMemo } from "react";

export type BracketTeamRef = { id: string; teamName: string } | null;

export type BracketGameNode = {
  id: string;
  round: string | null;
  homeTeam: BracketTeamRef;
  awayTeam: BracketTeamRef;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  advancesToGameId: string | null;
  fieldName?: string | null;
  startTime?: string | Date | null;
};

type Side = "home" | "away";
type DragPayload = { gameId: string; side: Side };

const CARD_W = 190;
const CARD_H = 62;
const GAP_X = 56;
const UNIT = 74; // vertical space per leaf (round-1) match

/**
 * Groups games into left-to-right rounds and works out each game's
 * position purely from the advancesToGameId graph -- this doesn't
 * depend on bracketSlot being populated, so it works for brackets
 * generated before that field was backfilled too.
 */
function useBracketLayout(games: BracketGameNode[]) {
  return useMemo(() => {
    if (games.length === 0) return null;

    const byRound = new Map<string, BracketGameNode[]>();
    for (const g of games) {
      const key = g.round ?? "Round";
      if (!byRound.has(key)) byRound.set(key, []);
      byRound.get(key)!.push(g);
    }
    // Each round has exactly half the games of the previous one, so
    // sorting groups by descending size orders them Round 1 -> Final.
    const roundGroups = [...byRound.values()].sort((a, b) => b.length - a.length);

    // Work out each game's left-to-right index within its round from
    // the graph, starting at the championship (index 0) and walking
    // backwards to round 1.
    const position = new Map<string, number>();
    const last = roundGroups[roundGroups.length - 1];
    last.forEach((g, i) => position.set(g.id, i));
    for (let r = roundGroups.length - 2; r >= 0; r--) {
      const round = roundGroups[r];
      const next = roundGroups[r + 1];
      const assigned: (BracketGameNode | null)[] = new Array(round.length).fill(null);
      for (const ng of next) {
        const p = position.get(ng.id)!;
        const feeders = round.filter((g) => g.advancesToGameId === ng.id);
        feeders.forEach((f, idx) => {
          assigned[2 * p + idx] = f;
        });
      }
      // Any feeder somehow not linked (shouldn't happen) falls back to
      // its original position so nothing silently disappears.
      round.forEach((g, i) => {
        if (position.get(g.id) === undefined && !assigned.includes(g)) {
          assigned[i] = assigned[i] ?? g;
        }
      });
      assigned.forEach((g, i) => {
        if (g) position.set(g.id, i);
      });
    }

    const orderedRounds = roundGroups.map((round) =>
      [...round].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
    );

    // Vertical center (in leaf units) of every game: round 1 games sit
    // at i + 0.5, and every later round's game centers on the midpoint
    // of the two games that feed into it.
    const centers: number[][] = [];
    centers.push(orderedRounds[0].map((_, i) => i + 0.5));
    for (let r = 1; r < orderedRounds.length; r++) {
      const prev = centers[r - 1];
      const row: number[] = [];
      for (let j = 0; j < orderedRounds[r].length; j++) {
        row.push((prev[2 * j] + prev[2 * j + 1]) / 2);
      }
      centers.push(row);
    }

    const leafCount = orderedRounds[0].length;
    const width = orderedRounds.length * CARD_W + (orderedRounds.length - 1) * GAP_X;
    const height = leafCount * UNIT;

    return { orderedRounds, centers, width, height };
  }, [games]);
}

export default function BracketTree({
  games,
  interactive = false,
  onDrop,
  isLocked,
}: {
  games: BracketGameNode[];
  interactive?: boolean;
  onDrop?: (target: DragPayload, e: React.DragEvent) => void;
  isLocked?: (game: BracketGameNode) => boolean;
}) {
  const layout = useBracketLayout(games);

  if (!layout) return null;
  const { orderedRounds, centers, width, height } = layout;

  return (
    <div className="mt-4 overflow-x-auto pb-4">
      <div className="relative" style={{ width, height: height + 40 }}>
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={width}
          height={height + 40}
        >
          {orderedRounds.slice(0, -1).flatMap((round, r) =>
            round
              .filter((g) => g.advancesToGameId)
              .map((g) => {
                const targetIdx = orderedRounds[r + 1].findIndex(
                  (t) => t.id === g.advancesToGameId
                );
                if (targetIdx === -1) return null;
                const y1 = centers[r][round.indexOf(g)] * UNIT + 20;
                const y2 = centers[r + 1][targetIdx] * UNIT + 20;
                const x1 = r * (CARD_W + GAP_X) + CARD_W;
                const x2 = (r + 1) * (CARD_W + GAP_X);
                const midX = x1 + GAP_X / 2;
                return (
                  <path
                    key={g.id}
                    d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
                    fill="none"
                    stroke="var(--steel)"
                    strokeWidth={2}
                  />
                );
              })
          )}
        </svg>

        {orderedRounds.map((round, r) => (
          <div key={r}>
            <div
              className="absolute text-xs font-semibold uppercase tracking-wide text-ink/50"
              style={{ left: r * (CARD_W + GAP_X), top: 0, width: CARD_W }}
            >
              {round[0]?.round ?? "Round"}
            </div>
            {round.map((game, i) => {
              const top = centers[r][i] * UNIT - CARD_H / 2 + 20;
              const left = r * (CARD_W + GAP_X);
              return (
                <div
                  key={game.id}
                  className="absolute overflow-hidden rounded-sm border border-steel/30 bg-white text-sm shadow-sm"
                  style={{ top, left, width: CARD_W, height: CARD_H }}
                >
                  <TreeSlot
                    game={game}
                    side="home"
                    interactive={interactive}
                    onDrop={onDrop}
                    locked={isLocked ? isLocked(game) : false}
                  />
                  <TreeSlot
                    game={game}
                    side="away"
                    interactive={interactive}
                    onDrop={onDrop}
                    locked={isLocked ? isLocked(game) : false}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TreeSlot({
  game,
  side,
  interactive,
  onDrop,
  locked,
}: {
  game: BracketGameNode;
  side: Side;
  interactive: boolean;
  onDrop?: (target: DragPayload, e: React.DragEvent) => void;
  locked: boolean;
}) {
  const team = side === "home" ? game.homeTeam : game.awayTeam;
  const otherTeam = side === "home" ? game.awayTeam : game.homeTeam;
  const score = side === "home" ? game.homeScore : game.awayScore;
  const isBye = !team && Boolean(otherTeam) && game.status === "FINAL";
  const draggable = interactive && Boolean(team) && !locked;

  const label = team ? team.teamName : isBye ? "BYE" : "TBD";

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ gameId: game.id, side }));
      }}
      onDragOver={(e) => {
        if (interactive && !locked) e.preventDefault();
      }}
      onDrop={(e) => {
        if (interactive && !locked && onDrop) onDrop({ gameId: game.id, side }, e);
      }}
      className={`flex h-[31px] items-center justify-between border-b border-steel/15 px-2 last:border-b-0 ${
        team
          ? draggable
            ? "cursor-move hover:bg-gold/20"
            : "bg-cream/40"
          : "text-ink/30"
      }`}
      title={isBye ? "Bye" : undefined}
    >
      <span className="truncate">{label}</span>
      {game.status === "FINAL" && (team || isBye) && (
        <span className="ml-1 shrink-0 text-xs font-semibold">{score ?? "-"}</span>
      )}
    </div>
  );
}
