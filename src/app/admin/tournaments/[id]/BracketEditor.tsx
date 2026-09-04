"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Game, Registration } from "@prisma/client";
import BracketTree from "@/components/BracketTree";

type GameWithTeams = Game & {
  homeTeam: Registration | null;
  awayTeam: Registration | null;
};

type Side = "home" | "away";
type DragPayload = { gameId: string; side: Side };

export default function BracketEditor({
  divisionId,
  games,
  bracketPublished,
}: {
  divisionId: string;
  games: GameWithTeams[];
  bracketPublished: boolean;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDrop(target: DragPayload, e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const source: DragPayload = JSON.parse(raw);

    const res = await fetch("/api/bracket/swap-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameAId: source.gameId,
        gameASide: source.side,
        gameBId: target.gameId,
        gameBSide: target.side,
      }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't move that team.");
    }
  }

  async function handlePublishToggle(published: boolean) {
    if (published) {
      const ok = window.confirm(
        "Publish this bracket? It will become visible to everyone on the public site."
      );
      if (!ok) return;
    }
    setPublishing(true);
    setError(null);
    const res = await fetch(`/api/divisions/${divisionId}/bracket-visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    });
    setPublishing(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError("Couldn't update bracket visibility.");
    }
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Bracket seeding
          </h3>
          <p className="mt-1 text-xs text-ink/50">
            Drag a team onto another slot to swap them. Locked once a game
            is scored final.
          </p>
        </div>
        {bracketPublished ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Live on public site
            </span>
            <button
              onClick={() => handlePublishToggle(false)}
              disabled={publishing}
              className="rounded-sm border border-steel/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-red hover:text-red"
            >
              Unpublish
            </button>
          </div>
        ) : (
          <button
            onClick={() => handlePublishToggle(true)}
            disabled={publishing}
            className="rounded-sm bg-red px-4 py-2 text-xs font-semibold text-white hover:bg-red-dark disabled:opacity-60"
          >
            {publishing ? "Publishing..." : "Confirm & publish bracket"}
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red">{error}</p>}

      <BracketTree
        games={games}
        interactive
        onDrop={handleDrop}
        isLocked={isRealFinal}
      />
    </div>
  );
}

function isRealFinal(game: GameWithTeams) {
  return game.status === "FINAL" && Boolean(game.homeTeamId) && Boolean(game.awayTeamId);
}
