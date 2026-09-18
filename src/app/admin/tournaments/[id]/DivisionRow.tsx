"use client";

import { useState } from "react";
import WaitlistPanel from "./WaitlistPanel";
import type { DivisionRow as DivisionRowData, OptionRef } from "./DivisionsManager";

const inputCls = "mt-1 w-full rounded-sm border border-steel/40 px-2 py-1.5 text-sm";
const labelCls = "text-xs font-medium text-ink/70";

const VISIBILITY_TOGGLES: { key: keyof DivisionRowData; label: string }[] = [
  { key: "showRegistration", label: "Registration page" },
  { key: "showTeamsAttending", label: "Teams attending" },
  { key: "showWaitlist", label: "Waitlist page" },
  { key: "showPoolStandings", label: "Pool standings" },
  { key: "showDivisionStandings", label: "Division standings" },
  { key: "showOverallStandings", label: "Overall standings" },
  { key: "showSchedule", label: "Schedule" },
  { key: "showResults", label: "Results" },
];

function OptionSelect({
  value,
  options,
  onChange,
  onCreate,
  placeholder,
}: {
  value: string | null;
  options: OptionRef[];
  onChange: (id: string | null, label: string | null) => void;
  onCreate: (label: string) => Promise<OptionRef>;
  placeholder: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  if (adding) {
    return (
      <div className="mt-1 flex gap-1">
        <input
          autoFocus
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New label"
          className="w-full rounded-sm border border-steel/40 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={busy || !newLabel.trim()}
          onClick={async () => {
            setBusy(true);
            const option = await onCreate(newLabel.trim());
            setBusy(false);
            setAdding(false);
            setNewLabel("");
            onChange(option.id, option.label);
          }}
          className="shrink-0 rounded-sm bg-navy px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="shrink-0 text-xs text-ink/50 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          setAdding(true);
          return;
        }
        const opt = options.find((o) => o.id === e.target.value);
        onChange(opt?.id ?? null, opt?.label ?? null);
      }}
      className={inputCls}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
      <option value="__new__">+ Add new…</option>
    </select>
  );
}

export default function DivisionRow({
  division,
  divisionOptions,
  subdivisionOptions,
  onCreateDivisionOption,
  onCreateSubdivisionOption,
  onPatch,
}: {
  division: DivisionRowData;
  divisionOptions: OptionRef[];
  subdivisionOptions: OptionRef[];
  onCreateDivisionOption: (label: string) => Promise<OptionRef>;
  onCreateSubdivisionOption: (label: string) => Promise<OptionRef>;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const d = division;

  return (
    <div className="space-y-5 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Division</label>
          <OptionSelect
            value={d.divisionOptionId}
            options={divisionOptions}
            onCreate={onCreateDivisionOption}
            placeholder="Choose division…"
            onChange={(id, label) =>
              onPatch({ divisionOptionId: id, ...(label ? { label } : {}) })
            }
          />
        </div>
        <div>
          <label className={labelCls}>Subdivision</label>
          <OptionSelect
            value={d.subdivisionOptionId}
            options={subdivisionOptions}
            onCreate={onCreateSubdivisionOption}
            placeholder="None"
            onChange={(id) => onPatch({ subdivisionOptionId: id })}
          />
        </div>
        <div>
          <label className={labelCls}>Public label override</label>
          <input
            defaultValue={d.publicLabelOverride ?? ""}
            onBlur={(e) => onPatch({ publicLabelOverride: e.target.value || null })}
            placeholder="Shown on site instead of the combo above"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Color tag</label>
          <input
            type="color"
            defaultValue={d.colorTag ?? "#888888"}
            onBlur={(e) => onPatch({ colorTag: e.target.value })}
            className="mt-1 h-9 w-full rounded-sm border border-steel/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            defaultValue={d.priceDollars ?? ""}
            placeholder="Event default"
            onBlur={(e) => onPatch({ priceDollars: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Special price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            defaultValue={d.specialPriceDollars ?? ""}
            onBlur={(e) => onPatch({ specialPriceDollars: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Special price cutoff</label>
          <input
            type="date"
            defaultValue={d.specialPriceCutoffDate}
            onBlur={(e) => onPatch({ specialPriceCutoffDate: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Team capacity</label>
          <input
            type="number"
            min="0"
            defaultValue={d.teamCap ?? ""}
            placeholder="Uncapped"
            onBlur={(e) => onPatch({ teamCap: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Game time limit (min)</label>
          <input
            type="number"
            min="0"
            defaultValue={d.gameTimeLimitMinutes ?? ""}
            onBlur={(e) => onPatch({ gameTimeLimitMinutes: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Break time (min)</label>
          <input
            type="number"
            min="0"
            defaultValue={d.breakMinutes ?? ""}
            onBlur={(e) => onPatch({ breakMinutes: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Format</label>
          <select
            defaultValue={d.format ?? "BOTH"}
            onChange={(e) => onPatch({ format: e.target.value })}
            className={inputCls}
          >
            <option value="POOL_PLAY">Pool play</option>
            <option value="BRACKET">Bracket</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Gender filter</label>
          <select
            defaultValue={d.genderFilter ?? ""}
            onChange={(e) => onPatch({ genderFilter: e.target.value || null })}
            className={inputCls}
          >
            <option value="">Open</option>
            <option value="COED">Coed</option>
            <option value="BOYS">Boys</option>
            <option value="GIRLS">Girls</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Ghost teams</label>
          <input
            type="number"
            min="0"
            defaultValue={d.ghostTeamsCount}
            onBlur={(e) => onPatch({ ghostTeamsCount: e.target.value || 0 })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>League games count</label>
          <input
            type="number"
            min="0"
            defaultValue={d.leagueGamesCount ?? ""}
            onBlur={(e) => onPatch({ leagueGamesCount: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Max RD</label>
          <input
            type="number"
            defaultValue={d.maxRD ?? ""}
            onBlur={(e) => onPatch({ maxRD: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="flex items-end pb-1.5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              defaultChecked={d.waitlistEnabled}
              onChange={(e) => onPatch({ waitlistEnabled: e.target.checked })}
            />
            Waitlist when full
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Address override</label>
          <input
            defaultValue={d.addressOverride ?? ""}
            placeholder="Only if this division plays elsewhere"
            onBlur={(e) => onPatch({ addressOverride: e.target.value || null })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Postal code override</label>
          <input
            defaultValue={d.postalCodeOverride ?? ""}
            onBlur={(e) => onPatch({ postalCodeOverride: e.target.value || null })}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
          Show publicly
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VISIBILITY_TOGGLES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={Boolean(d[key])}
                onChange={(e) => onPatch({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {d.waitlistEnabled && <WaitlistPanel divisionId={d.id} />}
    </div>
  );
}
