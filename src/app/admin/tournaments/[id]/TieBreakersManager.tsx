"use client";

import { useState } from "react";
import type { TiebreakerRule } from "@/lib/tiebreakers";

const RULE_OPTIONS: { value: TiebreakerRule; label: string }[] = [
  { value: "HEAD_TO_HEAD", label: "Head-to-head result" },
  { value: "RUN_DIFFERENTIAL", label: "Run/point differential" },
  { value: "RUNS_ALLOWED", label: "Runs/points allowed" },
  { value: "RUNS_SCORED", label: "Runs/points scored" },
  { value: "FEWEST_LOSSES", label: "Fewest losses" },
  { value: "FORFEIT_RECORD", label: "Forfeit record" },
  { value: "STRENGTH_OF_SCHEDULE", label: "Strength of schedule" },
  { value: "COIN_FLIP", label: "Coin flip / random" },
];

const RULE_LABEL: Record<TiebreakerRule, string> = Object.fromEntries(
  RULE_OPTIONS.map((o) => [o.value, o.label])
) as Record<TiebreakerRule, string>;

const inputCls = "mt-1 w-full max-w-xs rounded-sm border border-steel/40 px-3 py-2 text-sm";
const labelCls = "text-sm font-medium";

function RuleList({
  title,
  description,
  rules,
  onChange,
}: {
  title: string;
  description: string;
  rules: TiebreakerRule[];
  onChange: (rules: TiebreakerRule[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pickerValue, setPickerValue] = useState("");

  const available = RULE_OPTIONS.filter((o) => !rules.includes(o.value));

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...rules];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  }

  function handleRemove(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }

  function handleAdd() {
    if (!pickerValue) return;
    onChange([...rules, pickerValue as TiebreakerRule]);
    setPickerValue("");
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
      <p className="mt-1 text-xs text-ink/50">{description}</p>

      {rules.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">No rules yet — ties won&apos;t be broken.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rules.map((rule, index) => (
            <li
              key={rule}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="flex items-center gap-3 rounded-sm border border-steel/20 bg-cream/50 px-3 py-2"
            >
              <span className="cursor-grab select-none text-ink/30" title="Drag to reorder">
                ⠿
              </span>
              <span className="w-5 text-xs font-semibold text-ink/40">{index + 1}.</span>
              <span className="flex-1 text-sm">{RULE_LABEL[rule]}</span>
              <button
                onClick={() => handleRemove(index)}
                className="text-xs text-red hover:text-red-dark"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 && (
        <div className="mt-4 flex gap-2">
          <select
            value={pickerValue}
            onChange={(e) => setPickerValue(e.target.value)}
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          >
            <option value="">Add a rule…</option>
            {available.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!pickerValue}
            className="rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold hover:border-red hover:text-red disabled:opacity-50"
          >
            Add rule
          </button>
        </div>
      )}
    </div>
  );
}

export default function TieBreakersManager({
  tournamentId,
  initial,
}: {
  tournamentId: string;
  initial: {
    pointsPerEvent: number | null;
    pointsPerGamePlayed: number | null;
    poolTiebreakerOrder: TiebreakerRule[];
    seedingTiebreakerOrder: TiebreakerRule[];
  };
}) {
  const [pointsPerEvent, setPointsPerEvent] = useState(initial.pointsPerEvent);
  const [pointsPerGamePlayed, setPointsPerGamePlayed] = useState(initial.pointsPerGamePlayed);
  const [poolRules, setPoolRules] = useState(initial.poolTiebreakerOrder);
  const [seedingRules, setSeedingRules] = useState(initial.seedingTiebreakerOrder);

  function patch(body: Record<string, unknown>) {
    fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-steel/20 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Standings points
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Points per event win</label>
            <input
              type="number"
              value={pointsPerEvent ?? ""}
              onChange={(e) => setPointsPerEvent(e.target.value === "" ? null : Number(e.target.value))}
              onBlur={(e) => patch({ pointsPerEvent: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Points per game played</label>
            <input
              type="number"
              value={pointsPerGamePlayed ?? ""}
              onChange={(e) =>
                setPointsPerGamePlayed(e.target.value === "" ? null : Number(e.target.value))
              }
              onBlur={(e) => patch({ pointsPerGamePlayed: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <RuleList
        title="Pool tie breakers"
        description="Applied in order to rank teams within pool play."
        rules={poolRules}
        onChange={(rules) => {
          setPoolRules(rules);
          patch({ poolTiebreakerOrder: rules });
        }}
      />

      <RuleList
        title="Division / bracket seeding tie breakers"
        description="Applied in order to seed teams into the bracket."
        rules={seedingRules}
        onChange={(rules) => {
          setSeedingRules(rules);
          patch({ seedingTiebreakerOrder: rules });
        }}
      />
    </div>
  );
}
