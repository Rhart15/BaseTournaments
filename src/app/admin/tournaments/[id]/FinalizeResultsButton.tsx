"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FinalizeResultsButton({
  divisionId,
  disabled,
  alreadyFinalized,
}: {
  divisionId: string;
  disabled: boolean;
  alreadyFinalized: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/divisions/${divisionId}/finalize-results`, {
      method: "POST",
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't finalize results yet.");
    }
  }

  if (alreadyFinalized) {
    return (
      <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
        Results finalized
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={disabled || saving}
        className="rounded-sm bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-steel/30"
      >
        {saving ? "Finalizing..." : "Finalize results"}
      </button>
      {error && <span className="text-xs text-red">{error}</span>}
    </div>
  );
}
