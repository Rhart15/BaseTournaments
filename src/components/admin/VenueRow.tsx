"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Venue = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  fieldCount: number;
  /** Tournaments attached (legacy single-venue link + Schedule-step picker) + scheduled games -- used to gate delete. */
  usageCount: number;
};

export default function VenueRow({ venue }: { venue: Venue }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: venue.name,
    address: venue.address,
    city: venue.city,
    state: venue.state,
    fieldCount: String(venue.fieldCount),
  });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/venues/${venue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      setWarning(data?.warning ?? null);
      router.refresh();
    } else {
      setError(data?.error ?? "Couldn't save.");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(`Delete ${venue.name}? This can't be undone.`);
    if (!ok) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/venues/${venue.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data?.error ?? "Couldn't delete.");
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-steel/15 bg-gold/5">
        <td className="py-3" colSpan={5}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <div className="text-ink/50">Name</div>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-ink/50">Address</div>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-ink/50">City</div>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-28 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-ink/50">State</div>
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="mt-1 w-16 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <div className="text-ink/50">Fields</div>
              <input
                type="number"
                min={1}
                value={form.fieldCount}
                onChange={(e) => setForm({ ...form, fieldCount: e.target.value })}
                className="mt-1 w-16 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-sm bg-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-dark disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-xs font-semibold text-ink/60 hover:text-ink"
            >
              Cancel
            </button>
            {error && <span className="text-xs text-red">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-b border-steel/15">
        <td className="py-3">{venue.name}</td>
        <td className="text-ink/60">
          {venue.address}, {venue.city}, {venue.state}
        </td>
        <td>
          {venue.fieldCount} field{venue.fieldCount === 1 ? "" : "s"}
        </td>
        <td className="text-ink/50">{venue.usageCount > 0 ? "In use" : "Unused"}</td>
        <td className="text-right">
          <button
            onClick={() => setEditing(true)}
            className="mr-3 text-xs font-semibold text-red hover:text-red-dark"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={saving || venue.usageCount > 0}
            title={venue.usageCount > 0 ? "Attached to a tournament or has scheduled games -- detach/reassign first" : undefined}
            className="text-xs font-semibold text-ink/50 hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
        </td>
      </tr>
      {(error || warning) && (
        <tr className="border-b border-steel/15">
          <td colSpan={5} className={`py-1 text-xs ${error ? "text-red" : "text-gold"}`}>
            {error ?? warning}
          </td>
        </tr>
      )}
    </>
  );
}
