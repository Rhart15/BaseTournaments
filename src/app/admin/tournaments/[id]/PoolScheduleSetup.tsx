"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PoolScheduleSetup({
  divisionId,
  registeredCount,
}: {
  divisionId: string;
  registeredCount: number;
}) {
  const router = useRouter();
  const [poolCount, setPoolCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/divisions/${divisionId}/generate-pool-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolCount }),
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't generate the pool schedule.");
    }
  }

  return (
    <div className="rounded-sm border border-gold/40 bg-gold/10 p-4">
      <p className="text-sm font-semibold">
        {registeredCount} team{registeredCount === 1 ? "" : "s"} registered ·
        no pool schedule yet
      </p>
      <p className="mt-1 text-xs text-ink/60">
        Split them into pools and build the round-robin schedule. Once
        those games are scored, the bracket generator will be able to seed
        from the standings.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink/60">
          Number of pools
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={poolCount}
          onChange={(e) => setPoolCount(Number(e.target.value))}
          className="w-16 rounded-sm border border-steel/40 px-2 py-1 text-sm"
        />
        <button
          onClick={handleGenerate}
          disabled={saving || registeredCount < 2}
          className="rounded-sm bg-red px-4 py-2 text-xs font-semibold text-white hover:bg-red-dark disabled:cursor-not-allowed disabled:bg-steel/30"
        >
          {saving ? "Generating..." : "Generate pool schedule"}
        </button>
      </div>
      {registeredCount < 2 && (
        <p className="mt-2 text-xs text-red">
          Need at least 2 registered teams first.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
