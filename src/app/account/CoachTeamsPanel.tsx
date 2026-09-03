"use client";

import { useState } from "react";
import Link from "next/link";

type TeamRow = {
  id: string;
  name: string;
  ageGroup: string;
  homeCity: string | null;
  homeState: string;
};

export default function CoachTeamsPanel({ teams: initialTeams }: { teams: TeamRow[] }) {
  const [teams, setTeams] = useState(initialTeams);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/account/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ageGroup, homeCity }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setTeams((prev) => [...prev, data.team]);
    setName("");
    setAgeGroup("");
    setHomeCity("");
    setShowForm(false);
    setSubmitting(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="display text-2xl">Team management</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark"
        >
          + New team
        </button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Below are the teams you registered or manage as head coach.
      </p>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-4 grid gap-3 rounded-sm border border-steel/20 bg-cream p-4 sm:grid-cols-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            required
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <input
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            placeholder="Division (e.g. 10U Gold)"
            required
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <input
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
            placeholder="Home city"
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          {error && <p className="sm:col-span-3 text-sm text-red">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-3 rounded-sm bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create team"}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-2">
        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/teams/${t.id}/manage`}
            className="flex items-center justify-between rounded-sm border border-steel/20 bg-white px-4 py-3 text-sm hover:border-red"
          >
            <span className="font-semibold">
              {t.ageGroup} - {t.name}
            </span>
            <span className="text-ink/50">
              {t.homeCity ? `${t.homeCity}, ${t.homeState}` : t.homeState}
            </span>
          </Link>
        ))}
        {teams.length === 0 && (
          <p className="rounded-sm border border-steel/20 bg-white p-6 text-center text-sm text-ink/50">
            You don&apos;t manage any teams yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
