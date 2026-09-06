"use client";

import { useEffect, useState } from "react";

type InviteInfo = {
  teamName: string;
  tournamentName: string;
  division: string;
};

export default function GuestPlayerForm({ token }: { token: string }) {
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/guest-players/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? "This link isn't valid.");
          return;
        }
        setInvite(data);
      })
      .catch(() => setLoadError("Couldn't reach the server."));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter a first and last name.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/guest-players/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jerseyNumber: jerseyNumber.trim(),
        position: position.trim(),
      }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't add that player.");
    }
    setSubmitting(false);
  }

  if (loadError) {
    return <p className="text-sm text-red">{loadError}</p>;
  }

  if (!invite) {
    return <p className="text-sm text-ink/60">Loading...</p>;
  }

  if (done) {
    return (
      <div className="rounded-sm border border-green-600/30 bg-green-600/10 p-4">
        <p className="text-sm font-semibold text-green-700">
          {firstName} {lastName} was added to {invite.teamName}&apos;s roster.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 rounded-sm border border-steel/20 bg-cream p-4 text-sm">
        <p className="font-semibold">{invite.teamName}</p>
        <p className="text-ink/60">
          {invite.tournamentName} — {invite.division}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Jersey # (optional)</label>
          <input
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Position (optional)</label>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add guest player"}
        </button>
      </form>
    </div>
  );
}
