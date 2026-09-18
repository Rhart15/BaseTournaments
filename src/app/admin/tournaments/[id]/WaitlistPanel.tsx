"use client";

import { useEffect, useState } from "react";

type RegRow = {
  id: string;
  teamName: string;
  coachName: string;
  status: string;
  waitlistedAt: string | null;
};

// Manages who's on this division's waitlist and lets an admin invite one in.
// Checkout doesn't auto-waitlist teams yet (Division.teamCap isn't enforced
// there) -- this also lets an admin manually move an existing registration
// onto the waitlist, since that's currently the only way to reach it.
export default function WaitlistPanel({ divisionId }: { divisionId: string }) {
  const [regs, setRegs] = useState<RegRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/divisions/${divisionId}/registrations`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRegs(data.registrations ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load registrations.");
      });
    return () => {
      cancelled = true;
    };
  }, [divisionId]);

  async function setStatus(regId: string, status: "WAITLISTED" | "PENDING") {
    setBusyId(regId);
    setError(null);
    const res = await fetch(`/api/admin/registrations/${regId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Couldn't update status.");
      return;
    }
    setRegs((prev) =>
      (prev ?? []).map((r) => (r.id === regId ? { ...r, status } : r))
    );
  }

  if (regs === null) {
    return <p className="text-xs text-ink/50">Loading waitlist…</p>;
  }

  const waitlisted = regs.filter((r) => r.status === "WAITLISTED");
  const others = regs.filter((r) => r.status !== "WAITLISTED");

  return (
    <div className="rounded-sm border border-steel/20 bg-cream/50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/60">Waitlist</h4>

      {waitlisted.length === 0 ? (
        <p className="mt-2 text-sm text-ink/50">No teams currently waitlisted.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {waitlisted.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {r.teamName} <span className="text-ink/50">— {r.coachName}</span>
              </span>
              <button
                onClick={() => setStatus(r.id, "PENDING")}
                disabled={busyId === r.id}
                className="rounded-sm bg-navy px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busyId === r.id ? "Inviting…" : "Invite in"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-ink/50">
            Move a registered team to the waitlist ({others.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {others.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {r.teamName} <span className="text-ink/50">— {r.status}</span>
                </span>
                {r.status === "PENDING" && (
                  <button
                    onClick={() => setStatus(r.id, "WAITLISTED")}
                    disabled={busyId === r.id}
                    className="text-xs font-semibold text-red hover:text-red-dark disabled:opacity-50"
                  >
                    {busyId === r.id ? "Moving…" : "Move to waitlist"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
