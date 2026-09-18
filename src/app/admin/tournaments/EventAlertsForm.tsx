"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EventAlertsInitial = {
  weatherAlertButtonLabel: string;
  weatherAlertContent: string;
  eventAlertButtonLabel: string;
  eventAlertMessage: string;
};

const inputCls = "mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm";
const labelCls = "text-sm font-medium";
const sectionHeaderCls = "text-sm font-semibold uppercase tracking-wide text-ink/60";
const noteCls = "mt-1 text-xs text-ink/50";
const DECORATIVE_NOTE = "Not yet rendered on any public page — stored for now, wired up later.";

export default function EventAlertsForm({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: EventAlertsInitial;
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
      weatherAlertButtonLabel: form.get("weatherAlertButtonLabel"),
      weatherAlertContent: form.get("weatherAlertContent"),
      eventAlertButtonLabel: form.get("eventAlertButtonLabel"),
      eventAlertMessage: form.get("eventAlertMessage"),
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
    <form onSubmit={handleSubmit} className="space-y-8 rounded-sm border border-steel/20 bg-white p-6">
      <section className="space-y-3">
        <h3 className={sectionHeaderCls}>Weather / event updates</h3>
        <p className={noteCls}>{DECORATIVE_NOTE}</p>
        <div>
          <label className={labelCls}>Button label</label>
          <input
            name="weatherAlertButtonLabel"
            placeholder="Weather Updates"
            defaultValue={initial.weatherAlertButtonLabel}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Content (shown when expanded)</label>
          <textarea
            name="weatherAlertContent"
            rows={4}
            defaultValue={initial.weatherAlertContent}
            className={inputCls}
          />
        </div>
      </section>

      <section className="space-y-3 border-t border-steel/20 pt-6">
        <h3 className={sectionHeaderCls}>Event alert</h3>
        <p className={noteCls}>{DECORATIVE_NOTE}</p>
        <div>
          <label className={labelCls}>Button label</label>
          <input
            name="eventAlertButtonLabel"
            placeholder="Event Alert"
            defaultValue={initial.eventAlertButtonLabel}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Message</label>
          <p className={noteCls}>More urgent, banner-style — separate from weather updates above.</p>
          <textarea
            name="eventAlertMessage"
            rows={4}
            defaultValue={initial.eventAlertMessage}
            className={inputCls}
          />
        </div>
      </section>

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
