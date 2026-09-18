"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EventContentInitial = {
  description: string;
  additionalContent: string;
};

const inputCls = "mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm";
const labelCls = "text-sm font-medium";

export default function EventContentForm({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: EventContentInitial;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      description: form.get("description"),
      additionalContent: form.get("additionalContent"),
    };

    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-sm border border-steel/20 bg-white p-6">
      <div>
        <label className={labelCls}>Description / rules</label>
        <p className="mt-1 text-xs text-ink/50">
          Rendered publicly on the event&apos;s listing and detail pages today.
        </p>
        <textarea
          name="description"
          rows={6}
          defaultValue={initial.description}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Additional content</label>
        <p className="mt-1 text-xs text-ink/50">
          Separate free-form field shown below the main description — not yet rendered on any
          public page.
        </p>
        <textarea
          name="additionalContent"
          rows={6}
          defaultValue={initial.additionalContent}
          className={inputCls}
        />
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {saved && !error && <p className="text-sm text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
