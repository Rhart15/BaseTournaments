"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusSelect({
  endpoint,
  field,
  value,
  options,
}: {
  endpoint: string;
  field: string;
  value: string;
  options: string[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });

      if (!res.ok) {
        setCurrent(previous);
        setError("Couldn't save.");
        setSaving(false);
        return;
      }

      setSaving(false);
      router.refresh();
    } catch {
      setCurrent(previous);
      setError("Couldn't reach the server.");
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="rounded-sm border border-steel/40 bg-white px-2 py-1 text-xs"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-ink/40">Saving...</span>}
      {error && <span className="text-xs text-red">{error}</span>}
    </div>
  );
}
