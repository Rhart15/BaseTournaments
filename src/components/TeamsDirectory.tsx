"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type TeamRow = {
  id: string;
  name: string;
  ageGroup: string;
  homeCity: string | null;
  homeState: string;
  directorName: string | null;
};

export default function TeamsDirectory({ teams }: { teams: TeamRow[] }) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [division, setDivision] = useState("");

  const states = useMemo(
    () => Array.from(new Set(teams.map((t) => t.homeState))).sort(),
    [teams]
  );
  const divisions = useMemo(
    () => Array.from(new Set(teams.map((t) => t.ageGroup))).sort(),
    [teams]
  );

  const filtered = teams.filter((t) => {
    if (state && t.homeState !== state) return false;
    if (division && t.ageGroup !== division) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesName = t.name.toLowerCase().includes(q);
      const matchesCity = (t.homeCity ?? "").toLowerCase().includes(q);
      if (!matchesName && !matchesCity) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 rounded-sm border border-steel/20 bg-cream p-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Team name or city"
            className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60">
            Division
          </label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="mt-1 rounded-sm border border-steel/40 bg-white px-3 py-2 text-sm"
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {(search || state || division) && (
          <button
            onClick={() => {
              setSearch("");
              setState("");
              setDivision("");
            }}
            className="rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold text-ink/70 hover:border-red hover:text-red"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-steel/30 text-left text-ink/60">
              <th className="pb-2 font-medium">Team</th>
              <th className="pb-2 font-medium">Director</th>
              <th className="pb-2 font-medium">Division</th>
              <th className="pb-2 font-medium">State</th>
              <th className="pb-2 font-medium">City</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((team) => (
              <tr key={team.id} className="border-b border-steel/10">
                <td className="py-3 font-semibold">
                  <Link href={`/teams/${team.id}`} className="hover:text-red">
                    {team.name}
                  </Link>
                </td>
                <td className="py-3 text-ink/70">{team.directorName ?? "-"}</td>
                <td className="py-3 text-ink/70">{team.ageGroup}</td>
                <td className="py-3 text-ink/70">{team.homeState}</td>
                <td className="py-3 text-ink/70">{team.homeCity ?? "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink/50">
                  No teams match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
