"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetBracketButton({ divisionId }: { divisionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok = window.confirm(
      "This permanently deletes this division's entire bracket (winners, losers, and Grand Final) so it can be regenerated from scratch. Pool play games and standings are kept. Continue?"
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/divisions/${divisionId}/reset-bracket`, {
      method: "POST",
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError("Couldn't reset the bracket.");
    }
  }

  return (
    <span>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm font-semibold text-ink/50 hover:text-red disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset bracket"}
      </button>
      {error && <span className="ml-2 text-xs text-red">{error}</span>}
    </span>
  );
}
