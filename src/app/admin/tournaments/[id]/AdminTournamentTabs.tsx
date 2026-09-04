"use client";

import { useState } from "react";
import Link from "next/link";
import type { Game, Registration } from "@prisma/client";
import GenerateBracketButton from "./GenerateBracketButton";
import ScoreEntry from "./ScoreEntry";
import EditTournamentForm from "./EditTournamentForm";
import FlyerUpload from "./FlyerUpload";
import FinalizeResultsButton from "./FinalizeResultsButton";
import PoolScheduleSetup from "./PoolScheduleSetup";
import BracketEditor from "./BracketEditor";
import BracketFormatSettings from "./BracketFormatSettings";
import ResetBracketButton from "@/components/admin/ResetBracketButton";

type GameWithTeams = Game & {
  homeTeam: Registration | null;
  awayTeam: Registration | null;
};

type DivisionData = {
  id: string;
  label: string;
  resultsFinalized: boolean;
  bracketPublished: boolean;
  usePoolPlay: boolean;
  gameGuarantee: number;
  poolGames: GameWithTeams[];
  bracketGames: GameWithTeams[];
  allPoolGamesFinal: boolean;
  registeredCount: number;
};

const TABS = ["Info", "Results"] as const;
type Tab = (typeof TABS)[number];

export default function AdminTournamentTabs({
  tournamentId,
  tournamentName,
  flyerUrl,
  editFormInitial,
  editFormDivisions,
  divisions,
}: {
  tournamentId: string;
  tournamentName: string;
  flyerUrl: string | null;
  editFormInitial: {
    name: string;
    sport: string;
    startDate: string;
    endDate: string;
    city: string;
    state: string;
    entryFeeDollars: number;
    teamCap: number;
    description: string;
  };
  editFormDivisions: { id: string; label: string; teamCap: number | null }[];
  divisions: DivisionData[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Results");

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">{tournamentName}</h1>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-2 border-b border-steel/20">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold ${
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
          {activeTab === "Info" && (
            <div className="space-y-6">
              <div className="rounded-sm border border-steel/20 bg-white p-6">
                <FlyerUpload tournamentId={tournamentId} initialFlyerUrl={flyerUrl} />
              </div>
              <EditTournamentForm
                tournamentId={tournamentId}
                initial={editFormInitial}
                divisions={editFormDivisions}
              />
            </div>
          )}

          {activeTab === "Results" && (
            <div className="space-y-12">
              {divisions.length === 0 && (
                <p className="text-ink/60">No divisions yet for this tournament.</p>
              )}

              {divisions.map((division) => {
                // Grand Final decides it for a double-elimination bracket;
                // older single-elimination brackets (no losers bracket)
                // fall back to the Championship game finishing instead.
                const finalGame =
                  division.bracketGames.find((g) => g.round === "Grand Final") ??
                  division.bracketGames.find((g) => g.round === "Championship");
                const canFinalize = Boolean(
                  finalGame && finalGame.status === "FINAL"
                );

                return (
                  <section key={division.id}>
                    <div className="flex items-center justify-between">
                      <h2 className="display text-xl">{division.label}</h2>
                      <div className="flex items-center gap-4">
                        {division.bracketGames.length === 0 ? (
                          <GenerateBracketButton
                            divisionId={division.id}
                            disabled={
                              division.usePoolPlay
                                ? !division.allPoolGamesFinal
                                : division.registeredCount < 2
                            }
                          />
                        ) : (
                          <>
                            <Link
                              href={`/tournaments/${tournamentId}/divisions/${division.id}?tab=brackets`}
                              className="text-sm font-semibold text-red hover:text-red-dark"
                            >
                              View public bracket {"->"}
                            </Link>
                            <FinalizeResultsButton
                              divisionId={division.id}
                              disabled={!canFinalize}
                              alreadyFinalized={division.resultsFinalized}
                            />
                            <ResetBracketButton divisionId={division.id} />
                          </>
                        )}
                      </div>
                    </div>

                    {division.bracketGames.length === 0 && (
                      <div className="mt-4">
                        <BracketFormatSettings
                          divisionId={division.id}
                          usePoolPlay={division.usePoolPlay}
                          gameGuarantee={division.gameGuarantee}
                        />
                      </div>
                    )}

                    {division.usePoolPlay && (
                      <>
                        <h3 className="mt-4 text-sm font-semibold text-ink/60">
                          Pool play games
                        </h3>
                        <div className="mt-2 space-y-2">
                          {division.poolGames.length === 0 && (
                            <PoolScheduleSetup
                              divisionId={division.id}
                              registeredCount={division.registeredCount}
                            />
                          )}
                          {division.poolGames.map((game) => (
                            <ScoreEntry key={game.id} game={game} />
                          ))}
                        </div>
                      </>
                    )}

                    {division.bracketGames.length > 0 && (
                      <>
                        <div className="mt-6">
                          <BracketEditor
                            divisionId={division.id}
                            games={division.bracketGames}
                            bracketPublished={division.bracketPublished}
                          />
                        </div>

                        <h3 className="mt-6 text-sm font-semibold text-ink/60">
                          Bracket games
                        </h3>
                        <div className="mt-2 space-y-2">
                          {division.bracketGames.map((game) => (
                            <ScoreEntry key={game.id} game={game} />
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
