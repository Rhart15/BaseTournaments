"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Division = { id: string; label: string; teamCap?: number | null };

export default function EditTournamentForm({
  tournamentId,
  initial,
  divisions,
}: {
  tournamentId: string;
  initial: {
    name: string;
    sport: string;
    startDate: string;
    endDate: string;
    city: string;
    state: string;
    entryFeeDollars: number;
    teamCap: number;
    description: string;
  };
  divisions: Division[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [divisionList, setDivisionList] = useState(divisions);
  const [newDivision, setNewDivision] = useState("");
  const [newDivisionCap, setNewDivisionCap] = useState("");
  const [addingDivision, setAddingDivision] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      sport: form.get("sport"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      city: form.get("city"),
      state: form.get("state"),
      entryFeeDollars: form.get("entryFeeDollars"),
      teamCap: form.get("teamCap"),
      description: form.get("description"),
    };

    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleAddDivision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newDivision.trim()) return;
    setAddingDivision(true);

    const res = await fetch(
      `/api/admin/tournaments/${tournamentId}/divisions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newDivision.trim(),
          teamCap: newDivisionCap ? Number(newDivisionCap) : null,
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      setDivisionList((prev) => [...prev, data.division]);
      setNewDivision("");
      setNewDivisionCap("");
    }
    setAddingDivision(false);
  }

  async function handleUpdateDivisionCap(id: string, teamCap: string) {
    setDivisionList((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, teamCap: teamCap ? Number(teamCap) : null } : d
      )
    );
    await fetch(`/api/admin/divisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamCap: teamCap ? Number(teamCap) : null }),
    });
  }

  async function handleRemoveDivision(id: string) {
    setRemovingId(id);
    const res = await fetch(`/api/admin/divisions/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDivisionList((prev) => prev.filter((d) => d.id !== id));
    }
    setRemovingId(null);
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Tournament name</label>
          <input
            name="name"
            defaultValue={initial.name}
            required
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Sport</label>
            <select
              name="sport"
              defaultValue={initial.sport}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            >
              <option value="SOFTBALL">Softball</option>
              <option value="BASEBALL">Baseball</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Team cap</label>
            <input
              name="teamCap"
              type="number"
              min="1"
              defaultValue={initial.teamCap}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Start date</label>
            <input
              name="startDate"
              type="date"
              defaultValue={initial.startDate}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">End date</label>
            <input
              name="endDate"
              type="date"
              defaultValue={initial.endDate}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">City</label>
            <input
              name="city"
              defaultValue={initial.city}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">State</label>
            <input
              name="state"
              defaultValue={initial.state}
              maxLength={2}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Entry fee (dollars)</label>
          <input
            name="entryFeeDollars"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initial.entryFeeDollars}
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={initial.description}
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-green-700">Saved.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-red px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="mt-8 border-t border-steel/20 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Divisions
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {divisionList.map((d) => (
            <span
              key={d.id}
              className="flex items-center gap-2 rounded-sm bg-cream px-3 py-1 text-sm"
            >
              {d.label}
              <input
                type="number"
                min={0}
                defaultValue={d.teamCap ?? ""}
                placeholder="Uncapped"
                onBlur={(e) => handleUpdateDivisionCap(d.id, e.target.value)}
                className="w-20 rounded-sm border border-steel/40 px-1.5 py-0.5 text-xs"
                title="Team cap for this division (blank = uncapped)"
              />
              <button
                onClick={() => handleRemoveDivision(d.id)}
                disabled={removingId === d.id}
                className="text-xs text-red hover:text-red-dark disabled:opacity-50"
              >
                x
              </button>
            </span>
          ))}
          {divisionList.length === 0 && (
            <span className="text-sm text-ink/50">No divisions yet.</span>
          )}
        </div>

        <form onSubmit={handleAddDivision} className="mt-4 flex gap-2">
          <input
            value={newDivision}
            onChange={(e) => setNewDivision(e.target.value)}
            placeholder="e.g. 14U"
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            value={newDivisionCap}
            onChange={(e) => setNewDivisionCap(e.target.value)}
            placeholder="Team cap (optional)"
            className="w-36 rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addingDivision}
            className="rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold hover:border-red hover:text-red disabled:opacity-50"
          >
            {addingDivision ? "Adding..." : "Add division"}
          </button>
        </form>
      </div>
    </div>
  );
}
