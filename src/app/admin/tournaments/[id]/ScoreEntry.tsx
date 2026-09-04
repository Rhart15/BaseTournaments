"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Game, Registration } from "@prisma/client";

type GameWithTeams = Game & {
  homeTeam: Registration | null;
  awayTeam: Registration | null;
};

// Formats a Date into the value a <input type="datetime-local"> expects
// (local time, no timezone/seconds), or "" if there's no time set yet.
function toDatetimeLocalValue(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ScoreEntry({ game }: { game: GameWithTeams }) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(game.homeScore ?? "");
  const [awayScore, setAwayScore] = useState(game.awayScore ?? "");
  const [saving, setSaving] = useState(false);
  const [fieldName, setFieldName] = useState(game.fieldName ?? "");
  const [startTime, setStartTime] = useState(toDatetimeLocalValue(game.startTime));
  const [savingSchedule, setSavingSchedule] = useState(false);

  const canScore = game.homeTeam && game.awayTeam;

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/games/${game.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    await fetch(`/api/games/${game.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldName: fieldName.trim() || null,
        startTime: startTime ? new Date(startTime).toISOString() : null,
      }),
    });
    setSavingSchedule(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm border border-steel/20 bg-white px-4 py-3 text-sm">
      <span className="w-32 text-xs uppercase tracking-wide text-ink/50">
        {game.round ?? "Pool game"}
      </span>

      <span className="min-w-[9rem]">
        {game.homeTeam?.teamName ?? "TBD"}
      </span>
      <input
        type="number"
        min={0}
        value={homeScore}
        disabled={!canScore}
        onChange={(e) => setHomeScore(e.target.value)}
        className="w-16 rounded-sm border border-steel/40 px-2 py-1 disabled:bg-cream"
      />

      <span className="text-ink/40">vs</span>

      <input
        type="number"
        min={0}
        value={awayScore}
        disabled={!canScore}
        onChange={(e) => setAwayScore(e.target.value)}
        className="w-16 rounded-sm border border-steel/40 px-2 py-1 disabled:bg-cream"
      />
      <span className="min-w-[9rem]">
        {game.awayTeam?.teamName ?? "TBD"}
      </span>

      <span
        className={`ml-auto text-xs ${
          game.status === "FINAL" ? "text-ink/40" : "text-red"
        }`}
      >
        {game.status}
      </span>

      <button
        onClick={handleSave}
        disabled={!canScore || saving}
        className="rounded-sm bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-steel/30"
      >
        {saving ? "Saving…" : "Save score"}
      </button>

      <div className="flex w-full flex-wrap items-center gap-2 border-t border-steel/10 pt-2">
        <label className="text-xs uppercase tracking-wide text-ink/50">
          Field
        </label>
        <input
          type="text"
          placeholder="Field 3"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          className="w-24 rounded-sm border border-steel/40 px-2 py-1 text-xs"
        />
        <label className="text-xs uppercase tracking-wide text-ink/50">
          Time
        </label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-sm border border-steel/40 px-2 py-1 text-xs"
        />
        <button
          onClick={handleSaveSchedule}
          disabled={savingSchedule}
          className="rounded-sm border border-steel/40 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingSchedule ? "Saving…" : "Save field/time"}
        </button>
      </div>
    </div>
  );
}

