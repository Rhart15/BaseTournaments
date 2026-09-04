"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddTeamForm({
  directors,
}: {
  directors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    ageGroup: "",
    organization: "",
    homeCity: "",
    homeState: "AR",
    directorId: "",
  });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({
        name: "",
        ageGroup: "",
        organization: "",
        homeCity: "",
        homeState: "AR",
        directorId: "",
      });
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't create team.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark"
      >
        + Add team
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <div className="text-ink/50">Team name</div>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">Division</div>
          <input
            value={form.ageGroup}
            placeholder="e.g. 10U Gold"
            onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">Organization</div>
          <input
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">Home city</div>
          <input
            value={form.homeCity}
            onChange={(e) => setForm({ ...form, homeCity: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">State</div>
          <input
            value={form.homeState}
            onChange={(e) => setForm({ ...form, homeState: e.target.value })}
            className="mt-1 w-16 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">Director</div>
          <select
            value={form.directorId}
            onChange={(e) => setForm({ ...form, directorId: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          >
            <option value="">- None -</option>
            {directors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.ageGroup}
          className="rounded-sm bg-red px-4 py-2 text-xs font-semibold text-white hover:bg-red-dark disabled:cursor-not-allowed disabled:bg-steel/30"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs font-semibold text-ink/60 hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
