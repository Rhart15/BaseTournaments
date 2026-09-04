"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BracketFormatSettings({
  divisionId,
  usePoolPlay: initialUsePoolPlay,
  gameGuarantee: initialGameGuarantee,
}: {
  divisionId: string;
  usePoolPlay: boolean;
  gameGuarantee: number;
}) {
  const router = useRouter();
  const [usePoolPlay, setUsePoolPlay] = useState(initialUsePoolPlay);
  const [gameGuarantee, setGameGuarantee] = useState(initialGameGuarantee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { usePoolPlay: boolean; gameGuarantee: number }) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/divisions/${divisionId}/bracket-format`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't save bracket format.");
    }
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
        Bracket format
      </h3>
      <p className="mt-1 text-xs text-ink/50">
        Set this before generating the bracket -- it&apos;s locked once games exist.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={usePoolPlay}
            disabled={saving}
            onChange={(e) => {
              setUsePoolPlay(e.target.checked);
              save({ usePoolPlay: e.target.checked, gameGuarantee });
            }}
          />
          Use pool play
        </label>

        <label className="flex items-center gap-2 text-sm">
          Game guarantee
          <select
            value={gameGuarantee}
            disabled={saving}
            onChange={(e) => {
              const value = Number(e.target.value);
              setGameGuarantee(value);
              save({ usePoolPlay, gameGuarantee: value });
            }}
            className="rounded-sm border border-steel/40 px-2 py-1"
          >
            <option value={3}>3 game guarantee</option>
            <option value={4}>4 game guarantee</option>
          </select>
        </label>
      </div>

      {!usePoolPlay && (
        <p className="mt-2 text-xs text-ink/50">
          Pool play is off -- the bracket will seed straight from
          registration order. Use the bracket editor below to reseed by
          hand after generating.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}
