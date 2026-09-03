"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTournamentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

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
      divisionLabels: form.get("divisionLabels"),
    };

    const res = await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/admin/tournaments/${data.tournament.id}`);
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">New tournament</h1>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tournament name</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Sport</label>
              <select
                name="sport"
                required
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
                required
                defaultValue={24}
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
                required
                className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End date</label>
              <input
                name="endDate"
                type="date"
                required
                className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">City</label>
              <input
                name="city"
                required
                className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <input
                name="state"
                defaultValue="AR"
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
              required
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Divisions (comma separated, e.g. 8U, 10U, 12U)
            </label>
            <input
              name="divisionLabels"
              placeholder="8U, 10U, 12U, Open"
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              name="description"
              rows={3}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create tournament"}
          </button>
        </form>
      </div>
    </div>
  );
}
