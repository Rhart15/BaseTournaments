"use client";

import { useState } from "react";
import DivisionRowEditor from "./DivisionRow";

export type OptionRef = { id: string; label: string };

export type DivisionRow = {
  id: string;
  label: string;
  divisionOptionId: string | null;
  divisionOptionLabel: string | null;
  subdivisionOptionId: string | null;
  subdivisionOptionLabel: string | null;
  publicLabelOverride: string | null;
  priceDollars: number | null;
  teamCap: number | null;
  gameTimeLimitMinutes: number | null;
  breakMinutes: number | null;
  format: string | null;
  colorTag: string | null;
  waitlistEnabled: boolean;
  ghostTeamsCount: number;
  leagueGamesCount: number | null;
  maxRD: number | null;
  genderFilter: string | null;
  specialPriceDollars: number | null;
  specialPriceCutoffDate: string; // yyyy-mm-dd or ""
  addressOverride: string | null;
  postalCodeOverride: string | null;
  showRegistration: boolean;
  showTeamsAttending: boolean;
  showWaitlist: boolean;
  showPoolStandings: boolean;
  showDivisionStandings: boolean;
  showOverallStandings: boolean;
  showSchedule: boolean;
  showResults: boolean;
};

function displayLabel(d: DivisionRow) {
  if (d.publicLabelOverride) return d.publicLabelOverride;
  return d.subdivisionOptionLabel ? `${d.label} ${d.subdivisionOptionLabel}` : d.label;
}

function formatPrice(dollars: number | null) {
  return dollars === null ? "Event default" : `$${dollars.toFixed(2)}`;
}

export default function DivisionsManager({
  tournamentId,
  divisions,
  divisionOptions: initialDivisionOptions,
  subdivisionOptions: initialSubdivisionOptions,
}: {
  tournamentId: string;
  divisions: DivisionRow[];
  divisionOptions: OptionRef[];
  subdivisionOptions: OptionRef[];
}) {
  const [rows, setRows] = useState(divisions);
  const [divisionOptions, setDivisionOptions] = useState(initialDivisionOptions);
  const [subdivisionOptions, setSubdivisionOptions] = useState(initialSubdivisionOptions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingOptionId, setAddingOptionId] = useState("");
  const [addingSuboptionId, setAddingSuboptionId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDivisionOption(label: string): Promise<OptionRef> {
    const res = await fetch("/api/admin/division-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    setDivisionOptions((prev) =>
      prev.some((o) => o.id === data.option.id) ? prev : [...prev, data.option]
    );
    return data.option;
  }

  async function createSubdivisionOption(label: string): Promise<OptionRef> {
    const res = await fetch("/api/admin/subdivision-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    setSubdivisionOptions((prev) =>
      prev.some((o) => o.id === data.option.id) ? prev : [...prev, data.option]
    );
    return data.option;
  }

  async function handleAddRow() {
    if (!addingOptionId) return;
    setAdding(true);
    setError(null);

    const res = await fetch(`/api/admin/tournaments/${tournamentId}/divisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        divisionOptionId: addingOptionId,
        subdivisionOptionId: addingSuboptionId || undefined,
      }),
    });
    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't add division.");
      return;
    }

    const divisionOption = divisionOptions.find((o) => o.id === addingOptionId);
    const subdivisionOption = subdivisionOptions.find((o) => o.id === addingSuboptionId);

    const newRow: DivisionRow = {
      id: data.division.id,
      label: data.division.label,
      divisionOptionId: addingOptionId,
      divisionOptionLabel: divisionOption?.label ?? null,
      subdivisionOptionId: addingSuboptionId || null,
      subdivisionOptionLabel: subdivisionOption?.label ?? null,
      publicLabelOverride: null,
      priceDollars: null,
      teamCap: null,
      gameTimeLimitMinutes: null,
      breakMinutes: null,
      format: "BOTH",
      colorTag: null,
      waitlistEnabled: false,
      ghostTeamsCount: 0,
      leagueGamesCount: null,
      maxRD: null,
      genderFilter: null,
      specialPriceDollars: null,
      specialPriceCutoffDate: "",
      addressOverride: null,
      postalCodeOverride: null,
      showRegistration: true,
      showTeamsAttending: true,
      showWaitlist: true,
      showPoolStandings: true,
      showDivisionStandings: true,
      showOverallStandings: true,
      showSchedule: true,
      showResults: true,
    };

    setRows((prev) => [...prev, newRow]);
    setAddingOptionId("");
    setAddingSuboptionId("");
    setExpandedId(newRow.id);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this division? This can't be undone.")) return;
    setRemovingId(id);
    const res = await fetch(`/api/admin/divisions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
    setRemovingId(null);
  }

  function handlePatch(id: string, patch: Record<string, unknown>) {
    setRows((prev) => prev.map((r) => (r.id === id ? applyPatch(r, patch) : r)));
    fetch(`/api/admin/divisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setRows((prev) => {
      const fromIndex = prev.findIndex((r) => r.id === dragId);
      const toIndex = prev.findIndex((r) => r.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      fetch(`/api/admin/tournaments/${tournamentId}/divisions/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((r) => r.id) }),
      });
      return next;
    });
    setDragId(null);
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="rounded-sm border border-dashed border-steel/40 bg-white p-6 text-sm text-ink/50">
          No divisions yet. Add one below.
        </p>
      )}

      {rows.map((d) => {
        const expanded = expandedId === d.id;
        return (
          <div
            key={d.id}
            draggable
            onDragStart={() => setDragId(d.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(d.id)}
            className="rounded-sm border border-steel/20 bg-white"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="cursor-grab select-none text-ink/30" title="Drag to reorder">
                ⠿
              </span>
              <button
                onClick={() => setExpandedId(expanded ? null : d.id)}
                className="flex flex-1 items-center justify-between text-left"
              >
                <span className="font-semibold">{displayLabel(d)}</span>
                <span className="text-sm text-ink/60">{formatPrice(d.priceDollars)}</span>
              </button>
              <button
                onClick={() => setExpandedId(expanded ? null : d.id)}
                className="text-xs text-ink/50 hover:text-ink"
              >
                {expanded ? "Collapse" : "Edit"}
              </button>
              <button
                onClick={() => handleRemove(d.id)}
                disabled={removingId === d.id}
                className="text-xs text-red hover:text-red-dark disabled:opacity-50"
              >
                Remove
              </button>
            </div>

            {expanded && (
              <div className="border-t border-steel/20">
                <DivisionRowEditor
                  division={d}
                  divisionOptions={divisionOptions}
                  subdivisionOptions={subdivisionOptions}
                  onCreateDivisionOption={createDivisionOption}
                  onCreateSubdivisionOption={createSubdivisionOption}
                  onPatch={(patch) => handlePatch(d.id, patch)}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-sm border border-steel/20 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Add row</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs font-medium text-ink/70">Division</label>
            <select
              value={addingOptionId}
              onChange={(e) => setAddingOptionId(e.target.value)}
              className="mt-1 rounded-sm border border-steel/40 px-2 py-1.5 text-sm"
            >
              <option value="">Choose division…</option>
              {divisionOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink/70">Subdivision (optional)</label>
            <select
              value={addingSuboptionId}
              onChange={(e) => setAddingSuboptionId(e.target.value)}
              className="mt-1 rounded-sm border border-steel/40 px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {subdivisionOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddRow}
            disabled={adding || !addingOptionId}
            className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add Row"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red">{error}</p>}
      </div>
    </div>
  );
}

function applyPatch(row: DivisionRow, patch: Record<string, unknown>): DivisionRow {
  const next: DivisionRow = { ...row };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "priceDollars" || key === "specialPriceDollars") {
      (next as Record<string, unknown>)[key] = value === "" || value === null ? null : Number(value);
    } else if (
      ["teamCap", "gameTimeLimitMinutes", "breakMinutes", "leagueGamesCount", "maxRD"].includes(key)
    ) {
      (next as Record<string, unknown>)[key] = value === "" || value === null ? null : Number(value);
    } else if (key === "ghostTeamsCount") {
      next.ghostTeamsCount = value === "" || value === null ? 0 : Number(value);
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}
