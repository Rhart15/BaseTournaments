"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateBracketButton({
  divisionId,
  disabled,
}: {
  divisionId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/divisions/${divisionId}/generate-bracket`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't generate bracket");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        title={
          disabled
            ? "All pool games must be marked final first"
            : "Seed the bracket from final pool standings"
        }
        className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:cursor-not-allowed disabled:bg-steel/30 disabled:text-ink/50"
      >
        {loading ? "Generating…" : "Generate bracket"}
      </button>
      {error && <p className="mt-1 text-xs text-red">{error}</p>}
    </div>
  );
}
