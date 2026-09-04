"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import BracketTree, { type BracketGameNode } from "@/components/BracketTree";

type TeamRef = { id: string; teamName: string } | null;

type GameRow = {
  id: string;
  stage: string;
  round: string | null;
  poolId: string | null;
  pool: { id: string; label: string } | null;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  fieldName: string | null;
  startTime: string | Date | null;
  advancesToGameId: string | null;
  loserAdvancesToGameId?: string | null;
};

type RegistrationRow = {
  id: string;
  teamName: string;
  poolId: string | null;
  pool: { id: string; label: string } | null;
  poolWins: number;
  poolLosses: number;
  runsFor: number;
  runsAgainst: number;
};

const TABS = ["Schedule", "Standings", "Results", "Brackets"] as const;
type Tab = (typeof TABS)[number];

export default function DivisionTabs({
  division,
  pools,
  registrations,
  games,
  isAdmin,
}: {
  division: { id: string; label: string; bracketPublished: boolean };
  pools: { id: string; label: string }[];
  registrations: RegistrationRow[];
  games: GameRow[];
  isAdmin: boolean;
}) {
  const searchParams = useSearchParams();
  const initialTab = TABS.find(
    (t) => t.toLowerCase() === searchParams.get("tab")?.toLowerCase()
  );
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "Schedule");

  return (
    <div>
      <div className="flex gap-2 border-b border-steel/20">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
              activeTab === tab
                ? "border-b-2 border-red text-red"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "Schedule" && <ScheduleView pools={pools} games={games} />}
        {activeTab === "Standings" && (
          <StandingsView pools={pools} registrations={registrations} />
        )}
        {activeTab === "Results" && (
          <ResultsView pools={pools} registrations={registrations} games={games} />
        )}
        {activeTab === "Brackets" && (
          <BracketsView
            games={games}
            bracketPublished={division.bracketPublished}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}

function formatTime(startTime: string | Date | null): string {
  if (!startTime) return "Time TBD";
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return "Time TBD";
  return d.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------- Schedule ----------

function ScheduleView({
  pools,
  games,
}: {
  pools: { id: string; label: string }[];
  games: GameRow[];
}) {
  const groupOptions = useMemo(() => {
    const roundLabels = Array.from(
      new Set(games.filter((g) => g.stage === "BRACKET").map((g) => g.round ?? "Bracket"))
    );
    return [
      { key: "all", label: "All" },
      ...pools.map((p) => ({ key: `pool:${p.id}`, label: p.label })),
      ...roundLabels.map((r) => ({ key: `round:${r}`, label: r })),
    ];
  }, [pools, games]);

  const [filter, setFilter] = useState("all");

  const filtered = games.filter((g) => {
    if (filter === "all") return true;
    if (filter.startsWith("pool:")) return g.poolId === filter.slice(5);
    if (filter.startsWith("round:")) return (g.round ?? "Bracket") === filter.slice(6);
    return true;
  });

  if (games.length === 0) {
    return <p className="text-ink/60">The schedule hasn&apos;t been posted yet.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Filter
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-sm border border-steel/40 px-2 py-1 text-sm"
        >
          {groupOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-steel/40 text-left text-ink/50">
            <th className="py-2">Time</th>
            <th>Field</th>
            <th>Pool / Round</th>
            <th>Team</th>
            <th></th>
            <th>Team</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((g) => (
            <tr key={g.id} className="border-b border-steel/15">
              <td className="py-2">{formatTime(g.startTime)}</td>
              <td>{g.fieldName ?? "TBD"}</td>
              <td>{g.pool?.label ?? g.round ?? "-"}</td>
              <td>{g.homeTeam?.teamName ?? "TBD"}</td>
              <td className="text-center text-ink/40">
                {g.status === "FINAL"
                  ? `${g.homeScore ?? "-"} - ${g.awayScore ?? "-"}`
                  : "vs"}
              </td>
              <td>{g.awayTeam?.teamName ?? "TBD"}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-ink/50">
                No games in this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Standings ----------

function rankTeams<T extends { poolWins: number; poolLosses: number; runsFor: number; runsAgainst: number }>(
  teams: T[]
): T[] {
  return [...teams].sort((a, b) => {
    const pctA = a.poolWins / Math.max(a.poolWins + a.poolLosses, 1);
    const pctB = b.poolWins / Math.max(b.poolWins + b.poolLosses, 1);
    if (pctB !== pctA) return pctB - pctA;
    const diffA = a.runsFor - a.runsAgainst;
    const diffB = b.runsFor - b.runsAgainst;
    return diffB - diffA;
  });
}

function StandingsTable({ teams }: { teams: RegistrationRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-steel/40 text-left text-ink/50">
          <th className="py-2">Team</th>
          <th>W</th>
          <th>L</th>
          <th>RS</th>
          <th>RA</th>
          <th>RD</th>
        </tr>
      </thead>
      <tbody>
        {rankTeams(teams).map((t) => (
          <tr key={t.id} className="border-b border-steel/15">
            <td className="py-2">{t.teamName}</td>
            <td>{t.poolWins}</td>
            <td>{t.poolLosses}</td>
            <td>{t.runsFor}</td>
            <td>{t.runsAgainst}</td>
            <td>{t.runsFor - t.runsAgainst}</td>
          </tr>
        ))}
        {teams.length === 0 && (
          <tr>
            <td colSpan={6} className="py-6 text-center text-ink/50">
              No standings yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function StandingsView({
  pools,
  registrations,
}: {
  pools: { id: string; label: string }[];
  registrations: RegistrationRow[];
}) {
  const [subTab, setSubTab] = useState<"Pool" | "Division" | "Overall">("Pool");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["Pool", "Division", "Overall"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              subTab === t ? "bg-navy text-white" : "bg-cream text-ink/60 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === "Pool" &&
        (pools.length > 0 ? (
          <div className="space-y-8">
            {pools.map((pool) => (
              <div key={pool.id}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
                  {pool.label}
                </h3>
                <StandingsTable
                  teams={registrations.filter((r) => r.poolId === pool.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink/60">Pool play hasn&apos;t been set up yet.</p>
        ))}

      {(subTab === "Division" || subTab === "Overall") && (
        <StandingsTable teams={registrations} />
      )}
    </div>
  );
}

// ---------- Results (head-to-head grid) ----------

function ResultsView({
  pools,
  registrations,
  games,
}: {
  pools: { id: string; label: string }[];
  registrations: RegistrationRow[];
  games: GameRow[];
}) {
  const poolGames = games.filter((g) => g.stage === "POOL" && g.status === "FINAL");

  if (pools.length === 0) {
    return <p className="text-ink/60">Pool play hasn&apos;t been set up yet.</p>;
  }

  return (
    <div className="space-y-10">
      {pools.map((pool) => {
        const teams = registrations.filter((r) => r.poolId === pool.id);
        return (
          <div key={pool.id} className="overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
              {pool.label}
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-ink/50">
                  <th className="border border-steel/20 bg-cream p-2">Team</th>
                  {teams.map((t) => (
                    <th key={t.id} className="border border-steel/20 bg-cream p-2">
                      {t.teamName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((home) => (
                  <tr key={home.id}>
                    <td className="border border-steel/20 p-2 font-semibold">
                      {home.teamName}
                    </td>
                    {teams.map((away) => {
                      if (home.id === away.id) {
                        return (
                          <td
                            key={away.id}
                            className="border border-steel/20 bg-ink/80 p-2"
                          />
                        );
                      }
                      const game = poolGames.find(
                        (g) =>
                          (g.homeTeam?.id === home.id && g.awayTeam?.id === away.id) ||
                          (g.homeTeam?.id === away.id && g.awayTeam?.id === home.id)
                      );
                      let display = "-";
                      if (game) {
                        const ourScore =
                          game.homeTeam?.id === home.id ? game.homeScore : game.awayScore;
                        const theirScore =
                          game.homeTeam?.id === home.id ? game.awayScore : game.homeScore;
                        display = `${ourScore ?? "-"}-${theirScore ?? "-"}`;
                      }
                      return (
                        <td key={away.id} className="border border-steel/20 p-2 text-center">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Brackets ----------

function BracketsView({
  games,
  bracketPublished,
  isAdmin,
}: {
  games: GameRow[];
  bracketPublished: boolean;
  isAdmin: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const canSee = bracketPublished || isAdmin;
  const bracketGames = games.filter((g) => g.stage === "BRACKET") as unknown as BracketGameNode[];

  if (!canSee) {
    return <p className="text-ink/60">The bracket isn&apos;t posted yet -- check back soon.</p>;
  }

  if (bracketGames.length === 0) {
    return (
      <p className="text-ink/60">
        The bracket generates automatically once pool play standings are final.
      </p>
    );
  }

  const grandFinal = bracketGames.find((g) => g.round === "Grand Final") ?? null;
  const losersGames = bracketGames.filter((g) => (g.round ?? "").startsWith("Losers Round"));
  const winnersGames = bracketGames.filter(
    (g) => g !== grandFinal && !losersGames.includes(g)
  );

  return (
    <div>
      {isAdmin && !bracketPublished && (
        <p className="mb-4 rounded-sm bg-gold/20 px-3 py-2 text-sm font-semibold text-ink/70">
          Draft -- only admins can see this bracket. It isn&apos;t published to the
          public yet.
        </p>
      )}

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          className="rounded-sm border border-steel/40 px-3 py-1.5 text-xs font-semibold hover:border-red hover:text-red"
        >
          Zoom out
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          className="rounded-sm border border-steel/40 px-3 py-1.5 text-xs font-semibold hover:border-red hover:text-red"
        >
          Zoom in
        </button>
        <button
          onClick={() => setZoom(1)}
          className="rounded-sm border border-steel/40 px-3 py-1.5 text-xs font-semibold hover:border-red hover:text-red"
        >
          Reset
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-sm bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-deep"
        >
          Print
        </button>
      </div>

      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
          Winners bracket
        </h3>
        <BracketTree games={winnersGames} />

        {losersGames.length > 0 && (
          <>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink/50">
              Losers bracket
            </h3>
            <BracketTree games={losersGames} />
          </>
        )}

        {grandFinal && (
          <>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink/50">
              Grand Final
            </h3>
            <div className="mt-2 w-56 overflow-hidden rounded-sm border border-steel/30 bg-white text-sm shadow-sm">
              <div className="flex h-[31px] items-center justify-between border-b border-steel/15 px-2">
                <span className="truncate">{grandFinal.homeTeam?.teamName ?? "TBD"}</span>
                {grandFinal.status === "FINAL" && (
                  <span className="ml-1 shrink-0 text-xs font-semibold">
                    {grandFinal.homeScore ?? "-"}
                  </span>
                )}
              </div>
              <div className="flex h-[31px] items-center justify-between px-2">
                <span className="truncate">{grandFinal.awayTeam?.teamName ?? "TBD"}</span>
                {grandFinal.status === "FINAL" && (
                  <span className="ml-1 shrink-0 text-xs font-semibold">
                    {grandFinal.awayScore ?? "-"}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
