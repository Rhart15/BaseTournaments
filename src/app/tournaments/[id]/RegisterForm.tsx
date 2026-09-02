"use client";

import { useState } from "react";

export default function RegisterForm({
  tournamentId,
  divisions,
}: {
  tournamentId: string;
  divisions: { id: string; label: string }[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      tournamentId,
      divisionId: formData.get("divisionId"),
      teamName: formData.get("teamName"),
      coachName: formData.get("coachName"),
      coachEmail: formData.get("coachEmail"),
      coachPhone: formData.get("coachPhone"),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Division</label>
        <select
          name="divisionId"
          required
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Team name</label>
        <input
          name="teamName"
          required
          minLength={2}
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Coach name</label>
        <input
          name="coachName"
          required
          minLength={2}
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Coach email</label>
        <input
          name="coachEmail"
          type="email"
          required
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Coach phone</label>
        <input
          name="coachPhone"
          type="tel"
          required
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
      >
        {submitting ? "Redirecting to payment…" : "Register & pay"}
      </button>
      <p className="text-center text-xs text-ink/50">
        Secure checkout powered by Stripe.
      </p>
    </form>
  );
}
