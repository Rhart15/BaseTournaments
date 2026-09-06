"use client";

import { useState } from "react";

export default function RosterApprovalBanner({
  registrationId,
  initialStatus,
  reviewNote,
  hasPlayers,
}: {
  registrationId: string;
  initialStatus: string;
  reviewNote: string | null;
  hasPlayers: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/registrations/${registrationId}/roster/submit`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't submit the roster.");
      setSubmitting(false);
      return;
    }
    setStatus(data.registration.rosterApprovalStatus);
    setSubmitting(false);
  }

  const badge = {
    NOT_SUBMITTED: { label: "Not submitted", color: "bg-steel/20 text-ink/60" },
    SUBMITTED: { label: "Submitted — awaiting review", color: "bg-gold/20 text-ink" },
    APPROVED: { label: "Approved", color: "bg-green-600/10 text-green-700" },
    REJECTED: { label: "Changes needed", color: "bg-red/10 text-red" },
  }[status] ?? { label: status, color: "bg-steel/20 text-ink/60" };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-steel/20 bg-white p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50">
          Roster approval
        </p>
        <span
          className={`mt-1 inline-block rounded-sm px-2 py-1 text-xs font-semibold ${badge.color}`}
        >
          {badge.label}
        </span>
        {status === "REJECTED" && reviewNote && (
          <p className="mt-2 max-w-md text-sm text-ink/70">
            <span className="font-semibold">Note from BASE staff:</span>{" "}
            {reviewNote}
          </p>
        )}
      </div>

      {(status === "NOT_SUBMITTED" || status === "REJECTED") && (
        <div className="text-right">
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasPlayers}
            className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : status === "REJECTED"
              ? "Resubmit roster"
              : "Submit roster for approval"}
          </button>
          {!hasPlayers && (
            <p className="mt-1 text-xs text-ink/50">
              Add at least one player first.
            </p>
          )}
          {error && <p className="mt-1 text-xs text-red">{error}</p>}
        </div>
      )}
    </div>
  );
}
