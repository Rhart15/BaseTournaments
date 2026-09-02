"use client";

import { useState } from "react";

type RosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  position: string | null;
};

export default function RosterManager({
  registrationId,
  initialPlayers,
}: {
  registrationId: string;
  initialPlayers: RosterPlayer[];
}) {
  const [players, setPlayers] = useState<RosterPlayer[]>(initialPlayers);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter a first and last name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/registrations/${registrationId}/roster`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            jerseyNumber: jerseyNumber.trim(),
            position: position.trim(),
          }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Couldn't add that player.");
        setSubmitting(false);
        return;
      }

      setPlayers((prev) => [...prev, data.player]);
      setFirstName("");
      setLastName("");
      setJerseyNumber("");
      setPosition("");
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleRemove(playerId: string) {
    setRemovingId(playerId);
    setError(null);
    try {
      const res = await fetch(
        `/api/registrations/${registrationId}/roster/${playerId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Couldn't remove that player.");
        setRemovingId(null);
        return;
      }
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      setRemovingId(null);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setRemovingId(null);
    }
  }

  return (
    <div>
      {players.length === 0 ? (
        <p className="text-sm text-ink/60">
          No players on the roster yet - add your first below.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel/30 text-left text-ink/50">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">#</th>
              <th className="py-2 font-medium">Position</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b border-steel/10">
                <td className="py-2 font-semibold">
                  {p.firstName} {p.lastName}
                </td>
                <td className="py-2 text-ink/70">{p.jerseyNumber ?? "-"}</td>
                <td className="py-2 text-ink/70">{p.position ?? "-"}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleRemove(p.id)}
                    disabled={removingId === p.id}
                    className="text-xs font-semibold text-red hover:text-red-dark disabled:opacity-50"
                  >
                    {removingId === p.id ? "Removing..." : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-6 grid gap-3 rounded-sm border border-steel/20 bg-cream p-4 sm:grid-cols-2"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            First name
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Last name
          </label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Jersey # (optional)
          </label>
          <input
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Position (optional)
          </label>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="sm:col-span-2 text-sm text-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="sm:col-span-2 rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add player"}
        </button>
      </form>
    </div>
  );
}