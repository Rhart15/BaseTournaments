"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddVenueForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "AR", fieldCount: "1" });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ name: "", address: "", city: "", state: "AR", fieldCount: "1" });
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't create venue.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark"
      >
        + Add venue
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-4">
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
          disabled={saving || !form.name.trim() || !form.address.trim() || !form.city.trim()}
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
