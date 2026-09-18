"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type VenueOption = { id: string; name: string; fieldCount: number };

export type ScheduleGameRow = {
  id: string;
  divisionId: string;
  divisionLabel: string;
  stage: "POOL" | "BRACKET";
  round: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  venueId: string | null;
  fieldNumber: number | null;
  // ISO string, or null if not scheduled yet.
  startTime: string | null;
  scheduleLocked: boolean;
};

const inputCls = "rounded-sm border border-steel/40 px-2 py-1 text-xs";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayLabel(iso: string | null): string {
  if (!iso) return "Not scheduled yet";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function ScheduleManager({
  tournamentId,
  allVenues,
  attachedVenueIds,
  games,
}: {
  tournamentId: string;
  allVenues: VenueOption[];
  attachedVenueIds: string[];
  games: ScheduleGameRow[];
}) {
  const router = useRouter();
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>(attachedVenueIds);
  const [savingVenues, setSavingVenues] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [includeLocked, setIncludeLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rows, setRows] = useState(games);
  const [dragId, setDragId] = useState<string | null>(null);

  const venueById = useMemo(() => new Map(allVenues.map((v) => [v.id, v])), [allVenues]);
  const attachedVenues = useMemo(
    () => allVenues.filter((v) => selectedVenueIds.includes(v.id)),
    [allVenues, selectedVenueIds]
  );

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }),
    [rows]
  );

  // Marks which rows start a new day-separator, computed once rather than
  // mutated during render.
  const daySeparators = useMemo(() => {
    const flags: boolean[] = [];
    let lastDayKey: string | null = null;
    for (const game of sortedRows) {
      const dayKey = game.startTime ? game.startTime.slice(0, 10) : "unscheduled";
      flags.push(dayKey !== lastDayKey);
      lastDayKey = dayKey;
    }
    return flags;
  }, [sortedRows]);

  async function handleSaveVenues() {
    setSavingVenues(true);
    setError(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/venues`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueIds: selectedVenueIds }),
    });
    setSavingVenues(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't save venues.");
      return;
    }
    setNotice("Venues saved.");
    router.refresh();
  }

  async function handleGenerate(mode: "fill" | "regenerate") {
    if (mode === "regenerate") {
      const msg = includeLocked
        ? "This will reassign every game's venue/field/time, including ones you manually adjusted. Continue?"
        : "This will reassign every auto-scheduled game's venue/field/time. Games you manually adjusted are kept as-is. Continue?";
      if (!confirm(msg)) return;
    }
    setGenerating(true);
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}/generate-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, includeLocked }),
    });
    const data = await res.json().catch(() => null);
    setGenerating(false);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't generate the schedule.");
      return;
    }
    setNotice(
      `Scheduled ${data.scheduledCount} game${data.scheduledCount === 1 ? "" : "s"}` +
        (data.keptCount > 0 ? `, kept ${data.keptCount} as-is` : "") +
        (data.overflowCount > 0 ? ` — ${data.overflowCount} landed past the configured end date, extend it if that's not intended` : "") +
        "."
    );
    router.refresh();
  }

  function patchGame(id: string, patch: Partial<ScheduleGameRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveGamePatch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/games/${id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  function handleVenueSelect(gameId: string, venueId: string) {
    const fieldNumber = venueId ? 1 : null;
    patchGame(gameId, { venueId: venueId || null, fieldNumber, scheduleLocked: true });
    saveGamePatch(gameId, { venueId: venueId || null, fieldNumber });
  }

  function handleFieldSelect(gameId: string, fieldNumber: number) {
    patchGame(gameId, { fieldNumber, scheduleLocked: true });
    saveGamePatch(gameId, { fieldNumber });
  }

  function handleTimeChange(gameId: string, value: string) {
    const iso = value ? new Date(value).toISOString() : null;
    patchGame(gameId, { startTime: iso, scheduleLocked: true });
    saveGamePatch(gameId, { startTime: iso });
  }

  // Dragging one game onto another swaps their venue/field/time -- the
  // same "drag-to-reorder" interaction as the Divisions tab, applied to a
  // slot swap instead of a list position (which is what "reorder" means
  // for a schedule). Both games end up locked, since it's a manual move.
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const source = rows.find((r) => r.id === dragId);
    const target = rows.find((r) => r.id === targetId);
    setDragId(null);
    if (!source || !target) return;

    const sourceSlot = { venueId: source.venueId, fieldNumber: source.fieldNumber, startTime: source.startTime };
    const targetSlot = { venueId: target.venueId, fieldNumber: target.fieldNumber, startTime: target.startTime };

    patchGame(source.id, { ...targetSlot, scheduleLocked: true });
    patchGame(target.id, { ...sourceSlot, scheduleLocked: true });
    saveGamePatch(source.id, targetSlot);
    saveGamePatch(target.id, sourceSlot);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-steel/20 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Venues</h3>
        <p className="mt-1 text-xs text-ink/50">
          Which venues this event&apos;s schedule can use. Adding/creating a brand-new venue is not available here
          yet -- pick from the existing master list.
        </p>
        {allVenues.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">No venues exist in the master list yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {allVenues.map((v) => (
              <label key={v.id} className="flex items-center gap-2 rounded-sm border border-steel/20 px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedVenueIds.includes(v.id)}
                  onChange={(e) =>
                    setSelectedVenueIds((prev) =>
                      e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id)
                    )
                  }
                />
                {v.name} ({v.fieldCount} field{v.fieldCount === 1 ? "" : "s"})
              </label>
            ))}
          </div>
        )}
        <button
          onClick={handleSaveVenues}
          disabled={savingVenues}
          className="mt-3 rounded-sm border border-steel/40 px-4 py-1.5 text-xs font-semibold hover:border-red hover:text-red disabled:opacity-50"
        >
          {savingVenues ? "Saving…" : "Save venues"}
        </button>
      </div>

      <div className="rounded-sm border border-steel/20 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Generate schedule</h3>
        <p className="mt-1 text-xs text-ink/50">
          Assigns venue, field, and start time to every pool/bracket game already generated for this event&apos;s
          divisions. Never creates or re-pairs games -- generate those first from each division&apos;s Results tab.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleGenerate("fill")}
            disabled={generating || attachedVenues.length === 0}
            className="rounded-sm bg-red px-4 py-2 text-xs font-semibold text-white hover:bg-red-dark disabled:cursor-not-allowed disabled:bg-steel/30"
          >
            {generating ? "Working…" : "Generate schedule"}
          </button>
          <button
            onClick={() => handleGenerate("regenerate")}
            disabled={generating || attachedVenues.length === 0}
            className="rounded-sm border border-steel/40 px-4 py-2 text-xs font-semibold text-ink/70 hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            Regenerate schedule
          </button>
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input type="checkbox" checked={includeLocked} onChange={(e) => setIncludeLocked(e.target.checked)} />
            Also override manually-adjusted games
          </label>
        </div>
        {attachedVenues.length === 0 && (
          <p className="mt-2 text-xs text-red">Save at least one venue above first.</p>
        )}
        {error && <p className="mt-2 text-xs text-red">{error}</p>}
        {notice && !error && <p className="mt-2 text-xs text-green-700">{notice}</p>}
      </div>

      <div className="rounded-sm border border-steel/20 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Games</h3>
        {sortedRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">
            No games yet -- generate pool schedules/brackets for each division first.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {sortedRows.map((game, i) => {
              const showDaySeparator = daySeparators[i];
              const venue = game.venueId ? venueById.get(game.venueId) : null;

              return (
                <div key={game.id}>
                  {showDaySeparator && (
                    <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      {dayLabel(game.startTime)}
                    </p>
                  )}
                  <div
                    draggable
                    onDragStart={() => setDragId(game.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(game.id)}
                    className="flex flex-wrap items-center gap-2 rounded-sm border border-steel/20 bg-cream/40 px-3 py-2 text-xs"
                  >
                    <span className="cursor-grab select-none text-ink/30" title="Drag onto another game to swap slots">
                      ⠿
                    </span>
                    <span className="w-24 shrink-0 font-semibold">{game.divisionLabel}</span>
                    <span className="w-28 shrink-0 text-ink/50">{game.round ?? (game.stage === "POOL" ? "Pool" : "Bracket")}</span>
                    <span className="min-w-[10rem] flex-1">
                      {game.homeTeamName ?? "TBD"} <span className="text-ink/40">vs</span> {game.awayTeamName ?? "TBD"}
                    </span>

                    <select
                      value={game.venueId ?? ""}
                      onChange={(e) => handleVenueSelect(game.id, e.target.value)}
                      className={inputCls}
                    >
                      <option value="">No venue</option>
                      {attachedVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={game.fieldNumber ?? ""}
                      onChange={(e) => handleFieldSelect(game.id, Number(e.target.value))}
                      disabled={!venue}
                      className={inputCls}
                    >
                      {venue ? (
                        Array.from({ length: venue.fieldCount }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            Field {n}
                          </option>
                        ))
                      ) : (
                        <option value="">—</option>
                      )}
                    </select>

                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(game.startTime)}
                      onChange={(e) => handleTimeChange(game.id, e.target.value)}
                      className={inputCls}
                    />

                    {game.scheduleLocked && (
                      <span title="Manually adjusted -- kept as-is by Generate/Regenerate unless overridden" className="text-ink/40">
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
