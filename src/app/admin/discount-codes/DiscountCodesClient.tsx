"use client";

import { useState } from "react";

type Code = {
  id: string;
  code: string;
  type: "PERCENT" | "FLAT";
  value: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

export default function DiscountCodesClient({
  initialCodes,
}: {
  initialCodes: Code[];
}) {
  const [codes, setCodes] = useState(initialCodes);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim() || !value) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value,
        maxUses: maxUses || null,
        expiresAt: expiresAt || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setCodes((prev) => [data.code, ...prev]);
      setCode("");
      setValue("");
      setMaxUses("");
      setExpiresAt("");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create that code.");
    }
    setSubmitting(false);
  }

  async function toggleActive(id: string, active: boolean) {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    await fetch(`/api/admin/discount-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/discount-codes/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCodes((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div>
      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-2 gap-3 rounded-sm border border-steel/20 bg-white p-6 sm:grid-cols-5"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE"
          required
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm uppercase"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "PERCENT" | "FLAT")}
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        >
          <option value="PERCENT">% off</option>
          <option value="FLAT">$ off</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === "PERCENT" ? "e.g. 15" : "e.g. 25.00"}
          type="number"
          min="0"
          step={type === "PERCENT" ? "1" : "0.01"}
          required
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Max uses (optional)"
          type="number"
          min="1"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          type="date"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="col-span-2 rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60 sm:col-span-5"
        >
          {submitting ? "Creating..." : "+ Create discount code"}
        </button>
        {error && <p className="col-span-2 text-sm text-red sm:col-span-5">{error}</p>}
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steel/30 text-left text-ink/50">
            <th className="py-2">Code</th>
            <th>Discount</th>
            <th>Uses</th>
            <th>Expires</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => (
            <tr key={c.id} className="border-b border-steel/10">
              <td className="py-3 font-mono font-semibold">{c.code}</td>
              <td>
                {c.type === "PERCENT" ? `${c.value}%` : `$${(c.value / 100).toFixed(2)}`}
              </td>
              <td>
                {c.usedCount}
                {c.maxUses ? ` / ${c.maxUses}` : ""}
              </td>
              <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "-"}</td>
              <td>
                <button
                  onClick={() => toggleActive(c.id, !c.active)}
                  className={`rounded-sm px-2 py-1 text-xs font-semibold ${
                    c.active
                      ? "bg-green-600/10 text-green-700"
                      : "bg-steel/10 text-ink/50"
                  }`}
                >
                  {c.active ? "Active" : "Disabled"}
                </button>
              </td>
              <td className="text-right">
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs font-semibold text-ink/50 hover:text-red"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {codes.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-ink/50">
                No discount codes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
