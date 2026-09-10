"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Lead-admin-only: view and reassign which admin owns this tournament.
export default function OrganizerControl({
  tournamentId,
  currentOwnerId,
  admins,
}: {
  tournamentId: string;
  currentOwnerId: string | null;
  admins: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(currentOwnerId ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Couldn't reassign.");
      return;
    }
    setMsg("Organizer updated.");
    router.refresh();
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <h3 className="text-sm font-semibold">Organizer</h3>
      <p className="mt-1 text-xs text-ink/50">
        Registration fees for this tournament are paid into this admin&apos;s
        connected Stripe account. Only lead admins can change this.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        >
          {!currentOwnerId && <option value="">— choose an organizer —</option>}
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={busy || ownerId === (currentOwnerId ?? "")}
          className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save organizer"}
        </button>
        {msg && (
          <span
            className={`text-xs ${msg === "Organizer updated." ? "text-green-700" : "text-red"}`}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
