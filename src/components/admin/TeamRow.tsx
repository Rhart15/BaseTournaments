"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusSelect from "./StatusSelect";

type Team = {
  id: string;
  name: string;
  ageGroup: string;
  organization: string | null;
  homeCity: string | null;
  homeState: string;
  directorId: string | null;
  director: { name: string } | null;
  insuranceStatus: string;
  playerCount: number;
};

export default function TeamRow({
  team,
  directors,
}: {
  team: Team;
  directors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: team.name,
    ageGroup: team.ageGroup,
    organization: team.organization ?? "",
    homeCity: team.homeCity ?? "",
    homeState: team.homeState,
    directorId: team.directorId ?? "",
  });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/teams/${team.id}`, {
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
      `Remove ${team.name}? This deletes their roster too. Tournament registrations are kept but unlinked, not deleted.`
    );
    if (!ok) return;
    setSaving(true);
    const res = await fetch(`/api/admin/teams/${team.id}`, { method: "DELETE" });
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
      <td className="py-3">
        <Link href={`/teams/${team.id}`} className="hover:text-red">
          {team.name}
        </Link>
      </td>
      <td>{team.ageGroup}</td>
      <td>{team.director?.name ?? "-"}</td>
      <td>{team.playerCount}</td>
      <td>
        <StatusSelect
          endpoint={`/api/admin/teams/${team.id}`}
          field="insuranceStatus"
          value={team.insuranceStatus}
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
