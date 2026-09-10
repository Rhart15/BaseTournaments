"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  teamName: string;
  division: string;
  coachName: string;
  coachEmail: string;
  status: string;
  isPlan: boolean;
  isComp: boolean;
  chargedCents: number;
  refundedCents: number;
  refundCount: number;
};

type Preview = {
  isPlan: boolean;
  isComp: boolean;
  sharedCharge: boolean;
  chargedCents: number;
  alreadyRefundedCents: number;
  refundableCents: number;
  ownerName: string | null;
  ownerOnboarded: boolean;
  ownerBalanceCents: number | null;
  inBracket: boolean;
  priorRefunds: {
    amountCents: number;
    isFull: boolean;
    reason: string | null;
    note: string | null;
    source: string;
    createdAt: string;
  }[];
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-800",
    PENDING: "bg-gold/20 text-ink/70",
    REFUNDED: "bg-steel/20 text-ink/60",
    CANCELLED: "bg-steel/20 text-ink/60",
  };
  return (
    <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase ${map[status] ?? "bg-steel/20"}`}>
      {status}
    </span>
  );
}

export default function RegistrationsClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function openDialog(row: Row) {
    setOpenId(row.id);
    setPreview(null);
    setError(null);
    setResult(null);
    setMode("full");
    setAmount("");
    setReason("");
    setLoading(true);
    const res = await fetch(`/api/admin/registrations/${row.id}/refund`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't load refund details.");
      return;
    }
    setPreview(data);
  }

  function close() {
    setOpenId(null);
    setPreview(null);
  }

  async function submit() {
    if (!openId) return;
    setSubmitting(true);
    setError(null);
    const body: { amountCents?: number; reason?: string } = {};
    if (mode === "partial") {
      const cents = Math.round(parseFloat(amount) * 100);
      if (!cents || cents <= 0) {
        setError("Enter a dollar amount to refund.");
        setSubmitting(false);
        return;
      }
      body.amountCents = cents;
    }
    if (reason.trim()) body.reason = reason.trim();

    const res = await fetch(`/api/admin/registrations/${openId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Refund failed.");
      return;
    }
    setResult(
      `Refunded ${money(data.customerRefundedCents)} to the customer` +
        (data.transferReversedCents
          ? ` · ${money(data.transferReversedCents)} pulled back from the organizer`
          : "") +
        (data.platformAbsorbedCents
          ? ` · ${money(data.platformAbsorbedCents)} absorbed by BASE`
          : "") +
        (data.note ? ` — ${data.note}` : "")
    );
    router.refresh();
  }

  const openRow = rows.find((r) => r.id === openId);

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steel/30 text-left text-ink/50">
            <th className="py-2">Team</th>
            <th>Division</th>
            <th>Coach</th>
            <th>Paid</th>
            <th>Refunded</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const refundable =
              (r.status === "PAID" || r.isComp) &&
              r.status !== "REFUNDED" &&
              r.status !== "CANCELLED";
            return (
              <tr key={r.id} className="border-b border-steel/15">
                <td className="py-3 font-medium">
                  {r.teamName}
                  {r.isPlan && (
                    <span className="ml-2 text-[10px] uppercase text-ink/40">plan</span>
                  )}
                  {r.isComp && (
                    <span className="ml-2 text-[10px] uppercase text-ink/40">comp</span>
                  )}
                </td>
                <td>{r.division}</td>
                <td className="text-ink/60">
                  {r.coachName}
                  <br />
                  <span className="text-xs">{r.coachEmail}</span>
                </td>
                <td>{r.isComp ? "—" : money(r.chargedCents)}</td>
                <td>{r.refundedCents > 0 ? money(r.refundedCents) : "—"}</td>
                <td>
                  <StatusPill status={r.status} />
                </td>
                <td className="text-right">
                  {refundable ? (
                    <button
                      onClick={() => openDialog(r)}
                      className="text-xs font-semibold text-red hover:text-red-dark"
                    >
                      {r.isComp ? "Cancel" : "Refund"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-ink/50">
                No registrations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {openId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-sm bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl">
                {openRow?.isComp ? "Cancel registration" : "Refund"} — {openRow?.teamName}
              </h2>
              <button onClick={close} className="text-sm text-ink/50 hover:text-ink">
                Close
              </button>
            </div>

            {loading && <p className="mt-4 text-sm text-ink/60">Loading…</p>}

            {preview && !result && (
              <div className="mt-4 space-y-4 text-sm">
                {preview.isComp ? (
                  <p className="text-ink/70">
                    This is a comped / $0 registration — there&apos;s no payment to
                    refund. Confirming will cancel it and free the roster spot.
                  </p>
                ) : (
                  <>
                    <div className="rounded-sm bg-cream p-3 text-xs">
                      <div className="flex justify-between">
                        <span>Paid</span>
                        <span>{money(preview.chargedCents)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Already refunded</span>
                        <span>{money(preview.alreadyRefundedCents)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Still refundable</span>
                        <span>{money(preview.refundableCents)}</span>
                      </div>
                    </div>

                    {preview.isPlan && (
                      <p className="text-xs text-ink/60">
                        Payment plan — only a full refund is available. All paid
                        installments are refunded and any scheduled ones cancelled.
                      </p>
                    )}

                    {!preview.isPlan && (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={mode === "full"}
                            onChange={() => setMode("full")}
                          />
                          Full ({money(preview.refundableCents)})
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={mode === "partial"}
                            onChange={() => setMode("partial")}
                          />
                          Partial
                        </label>
                      </div>
                    )}

                    {mode === "partial" && !preview.isPlan && (
                      <div>
                        <label className="text-xs font-medium">Amount to refund ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-[11px] text-ink/50">
                          The $15 platform fee is not refunded on partial refunds.
                        </p>
                      </div>
                    )}

                    {preview.sharedCharge && (
                      <p className="text-[11px] text-ink/60">
                        This team was booked in a multi-team cart order — its
                        share is refunded from the shared charge and the $15
                        platform fee is kept.
                      </p>
                    )}

                    <p className="text-[11px] text-ink/60">
                      {mode === "full" && !preview.sharedCharge
                        ? "The full amount — including the $15 platform fee — goes back to the customer. BASE absorbs the $15."
                        : ""}{" "}
                      Funds are pulled back from {preview.ownerName ?? "the organizer"}
                      &apos;s connected account
                      {preview.ownerBalanceCents !== null
                        ? ` (available balance ${money(preview.ownerBalanceCents)})`
                        : ""}
                      . If their balance is short, Stripe recovers it from their
                      future payouts.
                    </p>

                    {preview.inBracket && (
                      <p className="rounded-sm bg-gold/20 px-3 py-2 text-xs">
                        This team is in a pool or a generated bracket — you&apos;ll need
                        to swap or regenerate it manually after refunding.
                      </p>
                    )}
                  </>
                )}

                <div>
                  <label className="text-xs font-medium">Reason (optional)</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
                    placeholder="e.g. team withdrew"
                  />
                </div>

                {error && <p className="text-sm text-red">{error}</p>}

                <div className="flex justify-end gap-3">
                  <button onClick={close} className="text-sm text-ink/60">
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
                  >
                    {submitting
                      ? "Processing…"
                      : openRow?.isComp
                      ? "Cancel registration"
                      : mode === "full"
                      ? "Refund in full"
                      : "Refund amount"}
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-3 text-sm">
                <p className="rounded-sm bg-green-100 px-3 py-2 text-green-800">{result}</p>
                <div className="flex justify-end">
                  <button
                    onClick={close}
                    className="rounded-sm bg-navy px-5 py-2 text-sm font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {error && !preview && !result && (
              <p className="mt-4 text-sm text-red">{error}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
