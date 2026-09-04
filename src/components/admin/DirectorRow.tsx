"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusSelect from "./StatusSelect";

type Director = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  region: string;
  sanctionFeePaid: boolean;
  backgroundCheckStatus: string;
};

export default function DirectorRow({ director }: { director: Director }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: director.name,
    email: director.email,
    phone: director.phone ?? "",
    region: director.region,
  });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/directors/${director.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't save.");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Remove ${director.name}? Any teams assigned to them will be unassigned, not deleted.`
    );
    if (!ok) return;
    setSaving(true);
    const res = await fetch(`/api/admin/directors/${director.id}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError("Couldn't delete.");
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
    <tr className="border-b border-steel/15">
      <td className="py-3">{director.name}</td>
      <td>{director.region}</td>
      <td>
        <StatusSelect
          endpoint={`/api/admin/directors/${director.id}`}
          field="sanctionFeePaid"
          value={director.sanctionFeePaid ? "true" : "false"}
          options={["true", "false"]}
        />
      </td>
      <td>
        <StatusSelect
          endpoint={`/api/admin/directors/${director.id}`}
          field="backgroundCheckStatus"
          value={director.backgroundCheckStatus}
          options={["PENDING", "SUBMITTED", "APPROVED", "EXPIRED"]}
        />
      </td>
      <td className="text-right">
        <button
          onClick={() => setEditing(true)}
          className="mr-3 text-xs font-semibold text-red hover:text-red-dark"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="text-xs font-semibold text-ink/50 hover:text-red disabled:opacity-60"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
