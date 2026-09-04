"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddDirectorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", region: "" });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/directors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ name: "", email: "", phone: "", region: "" });
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't create director.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark"
      >
        + Add director
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
          <div className="text-ink/50">Email</div>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">Phone</div>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          <div className="text-ink/50">Region</div>
          <input
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="mt-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.email || !form.region}
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
