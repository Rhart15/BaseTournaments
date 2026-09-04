"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CleanupTestDataButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    const ok = window.confirm(
      "This permanently deletes every division, team, and registration whose name contains \"test\" -- including all their games and brackets. Real tournament data is not touched. Continue?"
    );
    if (!ok) return;

    setRunning(true);
    setResult(null);
    const res = await fetch("/api/admin/cleanup-test-data", { method: "POST" });
    setRunning(false);

    if (res.ok) {
      const data = await res.json();
      setResult(
        `Removed ${data.divisionsDeleted} division(s), ${data.gamesDeleted} game(s), ` +
          `${data.registrationsDeleted} registration(s), and ${data.teamsDeleted} team(s). ` +
          `Repaired ${data.orphanedGamesRepaired} orphaned game(s).`
      );
      router.refresh();
    } else {
      setResult("Couldn't run cleanup -- try again.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={running}
        className="text-sm text-white/70 underline hover:text-white disabled:opacity-50"
      >
        {running ? "Cleaning up..." : "Clean up test data"}
      </button>
      {result && <p className="max-w-xs text-right text-xs text-white/60">{result}</p>}
    </div>
  );
}
