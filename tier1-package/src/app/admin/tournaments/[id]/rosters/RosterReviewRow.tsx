"use client";

import { useState } from "react";
import Link from "next/link";

type Registration = {
  id: string;
  teamName: string;
  division: string;
  playerCount: number;
  rosterApprovalStatus: string;
  rosterReviewNote: string | null;
};

export default function RosterReviewRow({
  registration,
}: {
  registration: Registration;
}) {
  const [status, setStatus] = useState(registration.rosterApprovalStatus);
  const [note, setNote] = useState(registration.rosterReviewNote ?? "");
  const [showNoteField, setShowNoteField] = useState(false);
  const [saving, setSaving] = useState(false);

  async function updateStatus(next: string) {
    setSaving(true);
    const res = await fetch(
      `/api/admin/registrations/${registration.id}/roster-approval`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rosterApprovalStatus: next,
          rosterReviewNote: note,
        }),
      }
    );
    if (res.ok) {
      setStatus(next);
      setShowNoteField(false);
    }
    setSaving(false);
  }

  const badgeColor =
    status === "APPROVED"
      ? "bg-green-600/10 text-green-700"
      : status === "REJECTED"
      ? "bg-red/10 text-red"
      : status === "SUBMITTED"
      ? "bg-gold/20 text-ink"
      : "bg-steel/20 text-ink/60";

  return (
    <tr className="border-b border-steel/10 align-top">
      <td className="py-3 font-semibold">
        <Link href={`/registrations/${registration.id}`} className="hover:text-red">
          {registration.teamName}
        </Link>
      </td>
      <td>{registration.division}</td>
      <td>{registration.playerCount}</td>
      <td>
        <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${badgeColor}`}>
          {status.replace("_", " ")}
        </span>
      </td>
      <td className="text-right">
        {status === "SUBMITTED" && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus("APPROVED")}
                disabled={saving}
                className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => setShowNoteField(true)}
                disabled={saving}
                className="text-xs font-semibold text-red hover:underline disabled:opacity-50"
              >
                Reject
              </button>
            </div>
            {showNoteField && (
              <div className="w-56">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What needs to change? (optional)"
                  className="w-full rounded-sm border border-steel/40 px-2 py-1 text-xs"
                  rows={2}
                />
                <button
                  onClick={() => updateStatus("REJECTED")}
                  disabled={saving}
                  className="mt-1 rounded-sm bg-red px-3 py-1 text-xs font-semibold text-white hover:bg-red-dark disabled:opacity-50"
                >
                  Confirm reject
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
