"use client";

import { useState } from "react";

type Athlete = {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
};

export default function ParentFamilyPanel({
  athletes: initialAthletes,
}: {
  athletes: Athlete[];
}) {
  const [athletes, setAthletes] = useState(initialAthletes);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/account/athletes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, birthYear }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setAthletes((prev) => [...prev, data.athlete]);
    setFirstName("");
    setLastName("");
    setBirthYear("");
    setSubmitting(false);
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/account/athletes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAthletes((prev) => prev.filter((a) => a.id !== id));
    }
  }

  return (
    <div>
      <h2 className="display text-2xl">Family</h2>
      <p className="mt-1 text-sm text-ink/60">
        Add the athletes in your family to track their tournament
        registrations.
      </p>

      <div className="mt-6 space-y-2">
        {athletes.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-sm border border-steel/20 bg-white px-4 py-3 text-sm"
          >
            <span className="font-semibold">
              {a.firstName} {a.lastName}
              {a.birthYear && (
                <span className="ml-2 font-normal text-ink/50">
                  ({a.birthYear})
                </span>
              )}
            </span>
            <button
              onClick={() => handleRemove(a.id)}
              className="text-xs font-semibold text-red hover:text-red-dark"
            >
              Remove
            </button>
          </div>
        ))}
        {athletes.length === 0 && (
          <p className="rounded-sm border border-steel/20 bg-white p-6 text-center text-sm text-ink/50">
            No athletes added yet.
          </p>
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="mt-6 grid gap-3 rounded-sm border border-steel/20 bg-cream p-4 sm:grid-cols-3"
      >
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          required
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          required
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          placeholder="Birth year"
          type="number"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        {error && <p className="sm:col-span-3 text-sm text-red">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="sm:col-span-3 rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
        >
          {submitting ? "Adding..." : "+ Add Athlete to My Family"}
        </button>
      </form>
    </div>
  );
}
