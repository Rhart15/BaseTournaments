"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CustomButton = { id: string; text: string; url: string };

export type EventScheduleInitial = {
  hideSchedule: boolean;
  scheduleIntervalMinutes: number;
  maxGamesPerDay: number | null;
  coachSelfSchedulingEnabled: boolean;
  coachSelfScoringEnabled: boolean;
  poolToPoolEvent: boolean;
  scheduleNotesWhenShown: string;
  scheduleNotesWhenHidden: string;

  payPerGameEnabled: boolean;
  payPerGameIncludedGames: number | null;
  payPerGameMaxPerDay: number | null;
  payPerGamePriceDollars: number | null;
  payPerGameRequestEnabledInDashboard: boolean;

  paidPracticeEnabled: boolean;
  paidPracticeMaxSessions: number | null;
  paidPracticeDurationMinutes: number | null;
  paidPracticePriceDollars: number | null;
};

const inputCls = "mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm";
const labelCls = "text-sm font-medium";
const sectionHeaderCls = "text-sm font-semibold uppercase tracking-wide text-ink/60";
const noteCls = "mt-1 text-xs text-ink/50";
const DECORATIVE_NOTE =
  "Not yet read by the scheduling engine or by checkout pricing — stored for now, wired up later.";

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function CustomButtonsManager({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: CustomButton[];
}) {
  const [buttons, setButtons] = useState(initial);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim() || !url.trim()) return;
    setAdding(true);
    setError(null);

    const res = await fetch(`/api/admin/tournaments/${tournamentId}/custom-buttons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), url: url.trim() }),
    });
    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't add button.");
      return;
    }
    setButtons((prev) => [...prev, { id: data.button.id, text: data.button.text, url: data.button.url }]);
    setText("");
    setUrl("");
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/admin/custom-buttons/${id}`, { method: "DELETE" });
    if (res.ok) setButtons((prev) => prev.filter((b) => b.id !== id));
  }

  function handleFieldBlur(id: string, patch: Partial<CustomButton>) {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    fetch(`/api/admin/custom-buttons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setButtons((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === dragId);
      const toIndex = prev.findIndex((b) => b.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      fetch(`/api/admin/tournaments/${tournamentId}/custom-buttons/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((b) => b.id) }),
      });
      return next;
    });
    setDragId(null);
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <h3 className={sectionHeaderCls}>Custom buttons</h3>
      <p className={noteCls}>Shown on the public event page. Not yet rendered there — storage only for now.</p>

      {buttons.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">No custom buttons yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {buttons.map((b) => (
            <li
              key={b.id}
              draggable
              onDragStart={() => setDragId(b.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(b.id)}
              className="flex items-center gap-2 rounded-sm border border-steel/20 bg-cream/50 px-3 py-2"
            >
              <span className="cursor-grab select-none text-ink/30" title="Drag to reorder">
                ⠿
              </span>
              <input
                defaultValue={b.text}
                onBlur={(e) => handleFieldBlur(b.id, { text: e.target.value })}
                placeholder="Button text"
                className="w-40 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
              <input
                defaultValue={b.url}
                onBlur={(e) => handleFieldBlur(b.id, { url: e.target.value })}
                placeholder="https://…"
                className="flex-1 rounded-sm border border-steel/40 px-2 py-1 text-sm"
              />
              <button onClick={() => handleRemove(b.id)} className="text-xs text-red hover:text-red-dark">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Button text"
          className="w-40 rounded-sm border border-steel/40 px-2 py-1.5 text-sm"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1 min-w-[12rem] rounded-sm border border-steel/40 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={adding || !text.trim() || !url.trim()}
          className="rounded-sm border border-steel/40 px-4 py-1.5 text-sm font-semibold hover:border-red hover:text-red disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add row"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
    </div>
  );
}

export default function EventScheduleForm({
  tournamentId,
  initial,
  customButtons,
}: {
  tournamentId: string;
  initial: EventScheduleInitial;
  customButtons: CustomButton[];
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
    const checkbox = (name: string) => form.get(name) === "on";
    const val = (name: string) => form.get(name);

    const payload = {
      hideSchedule: val("displaySchedule") === "HIDE",
      scheduleIntervalMinutes: val("scheduleIntervalMinutes"),
      maxGamesPerDay: val("maxGamesPerDay"),
      coachSelfSchedulingEnabled: checkbox("coachSelfSchedulingEnabled"),
      coachSelfScoringEnabled: checkbox("coachSelfScoringEnabled"),
      poolToPoolEvent: checkbox("poolToPoolEvent"),
      scheduleNotesWhenShown: val("scheduleNotesWhenShown"),
      scheduleNotesWhenHidden: val("scheduleNotesWhenHidden"),

      payPerGameEnabled: checkbox("payPerGameEnabled"),
      payPerGameIncludedGames: val("payPerGameIncludedGames"),
      payPerGameMaxPerDay: val("payPerGameMaxPerDay"),
      payPerGamePriceDollars: val("payPerGamePriceDollars"),
      payPerGameRequestEnabledInDashboard: checkbox("payPerGameRequestEnabledInDashboard"),

      paidPracticeEnabled: checkbox("paidPracticeEnabled"),
      paidPracticeMaxSessions: val("paidPracticeMaxSessions"),
      paidPracticeDurationMinutes: val("paidPracticeDurationMinutes"),
      paidPracticePriceDollars: val("paidPracticePriceDollars"),
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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-8 rounded-sm border border-steel/20 bg-white p-6">
        <section className="space-y-3">
          <h3 className={sectionHeaderCls}>Schedule options</h3>
          <p className={noteCls}>{DECORATIVE_NOTE}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Display schedule</label>
              <select
                name="displaySchedule"
                defaultValue={initial.hideSchedule ? "HIDE" : "SHOW"}
                className={inputCls}
              >
                <option value="SHOW">Show schedule</option>
                <option value="HIDE">Hide schedule</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Schedule interval</label>
              <select
                name="scheduleIntervalMinutes"
                defaultValue={initial.scheduleIntervalMinutes}
                className={inputCls}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Max games per day</label>
              <input
                type="number"
                min="0"
                name="maxGamesPerDay"
                defaultValue={initial.maxGamesPerDay ?? ""}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Toggle
              name="coachSelfSchedulingEnabled"
              label="Coaches can self-schedule games"
              defaultChecked={initial.coachSelfSchedulingEnabled}
            />
            <Toggle
              name="coachSelfScoringEnabled"
              label="Coaches can self-score games"
              defaultChecked={initial.coachSelfScoringEnabled}
            />
            <Toggle name="poolToPoolEvent" label="Pool-to-pool event" defaultChecked={initial.poolToPoolEvent} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Notes shown when schedule IS displayed</label>
              <textarea
                name="scheduleNotesWhenShown"
                rows={3}
                defaultValue={initial.scheduleNotesWhenShown}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notes shown when schedule is NOT displayed</label>
              <textarea
                name="scheduleNotesWhenHidden"
                rows={3}
                defaultValue={initial.scheduleNotesWhenHidden}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Sell event by number of games</h3>
          <p className={noteCls}>{DECORATIVE_NOTE}</p>
          <Toggle name="payPerGameEnabled" label="Enabled" defaultChecked={initial.payPerGameEnabled} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Included games</label>
              <input
                type="number"
                min="0"
                name="payPerGameIncludedGames"
                defaultValue={initial.payPerGameIncludedGames ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Max games per day</label>
              <input
                type="number"
                min="0"
                name="payPerGameMaxPerDay"
                defaultValue={initial.payPerGameMaxPerDay ?? ""}
                className={inputCls}
              />
              <p className={noteCls}>Separate from the schedule-wide cap above.</p>
            </div>
            <div>
              <label className={labelCls}>Price per additional game ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="payPerGamePriceDollars"
                defaultValue={initial.payPerGamePriceDollars ?? ""}
                className={inputCls}
              />
            </div>
          </div>
          <Toggle
            name="payPerGameRequestEnabledInDashboard"
            label="Enable game/match request on customer dashboard"
            defaultChecked={initial.payPerGameRequestEnabledInDashboard}
          />
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Practice sessions</h3>
          <p className={noteCls}>{DECORATIVE_NOTE}</p>
          <Toggle name="paidPracticeEnabled" label="Enabled" defaultChecked={initial.paidPracticeEnabled} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Max practice sessions</label>
              <input
                type="number"
                min="0"
                name="paidPracticeMaxSessions"
                defaultValue={initial.paidPracticeMaxSessions ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input
                type="number"
                min="0"
                name="paidPracticeDurationMinutes"
                defaultValue={initial.paidPracticeDurationMinutes ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Price per session ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="paidPracticePriceDollars"
                defaultValue={initial.paidPracticePriceDollars ?? ""}
                className={inputCls}
              />
            </div>
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

      <CustomButtonsManager tournamentId={tournamentId} initial={customButtons} />
    </div>
  );
}
