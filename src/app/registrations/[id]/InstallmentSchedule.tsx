"use client";

import { useState } from "react";

type Installment = {
  id: string;
  dueDate: string;
  amountCents: number;
  status: string;
  lastError: string | null;
};

export default function InstallmentSchedule({
  registrationId,
  installments,
}: {
  registrationId: string;
  installments: Installment[];
}) {
  const [rows, setRows] = useState(installments);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  async function handleRetry(installmentId: string) {
    setRetryingId(installmentId);
    const res = await fetch(
      `/api/registrations/${registrationId}/installments/${installmentId}/retry`,
      { method: "POST" }
    );
    if (res.ok) {
      const data = await res.json();
      setRows((prev) =>
        prev.map((r) => (r.id === installmentId ? { ...r, ...data.installment } : r))
      );
    }
    setRetryingId(null);
  }

  return (
    <div className="mb-6 rounded-sm border border-steel/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-ink/50">
        Payment plan
      </p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-steel/20 text-left text-ink/50">
            <th className="py-1">Due</th>
            <th>Amount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-steel/10">
              <td className="py-2">
                {i === 0 ? "Today" : new Date(r.dueDate).toLocaleDateString()}
              </td>
              <td>${(r.amountCents / 100).toFixed(2)}</td>
              <td>
                <span
                  className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${
                    r.status === "PAID"
                      ? "bg-green-600/10 text-green-700"
                      : r.status === "FAILED"
                      ? "bg-red/10 text-red"
                      : "bg-steel/20 text-ink/60"
                  }`}
                >
                  {r.status}
                </span>
                {r.status === "FAILED" && r.lastError && (
                  <p className="mt-1 text-xs text-ink/50">{r.lastError}</p>
                )}
              </td>
              <td className="text-right">
                {r.status === "FAILED" && (
                  <button
                    onClick={() => handleRetry(r.id)}
                    disabled={retryingId === r.id}
                    className="text-xs font-semibold text-red hover:text-red-dark disabled:opacity-50"
                  >
                    {retryingId === r.id ? "Retrying..." : "Retry payment"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
