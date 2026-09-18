"use client";

import { useState } from "react";
import Link from "next/link";
import type { Game, Registration } from "@prisma/client";
import GenerateBracketButton from "./GenerateBracketButton";
import ScoreEntry from "./ScoreEntry";
import EventDetailsForm, { type EventDetailsInitial } from "../EventDetailsForm";
import EventOptionsForm, { type EventOptionsInitial } from "../EventOptionsForm";
import EventScheduleForm, {
  type EventScheduleInitial,
  type CustomButton,
} from "../EventScheduleForm";
import EventContentForm, { type EventContentInitial } from "../EventContentForm";
import EventAlertsForm, { type EventAlertsInitial } from "../EventAlertsForm";
import DivisionsManager, { type DivisionRow, type OptionRef } from "./DivisionsManager";
import TieBreakersManager from "./TieBreakersManager";
import type { TiebreakerRule } from "@/lib/tiebreakers";
import FlyerUpload from "./FlyerUpload";
import LogoUpload from "./LogoUpload";
import FinalizeResultsButton from "./FinalizeResultsButton";
import PoolScheduleSetup from "./PoolScheduleSetup";
import ScheduleManager, { type VenueOption, type ScheduleGameRow } from "./ScheduleManager";
import BracketEditor from "./BracketEditor";
import BracketFormatSettings from "./BracketFormatSettings";
import ResetBracketButton from "@/components/admin/ResetBracketButton";
import OrganizerControl from "./OrganizerControl";

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

const TABS = [
  "Details",
  "Divisions",
  "Content",
  "Options",
  "Schedule",
  "Tie Breakers",
  "Alerts",
  "Results",
] as const;
type Tab = (typeof TABS)[number];

export default function AdminTournamentTabs({
  tournamentId,
  tournamentName,
  flyerUrl,
  logoUrl,
  isLead,
  currentUserId,
  owner,
  admins,
  detailsInitial,
  divisionOptions,
  subdivisionOptions,
  divisionRows,
  tiebreakersInitial,
  optionsInitial,
  scheduleInitial,
  allVenues,
  attachedVenueIds,
  scheduleGames,
  customButtons,
  contentInitial,
  alertsInitial,
  divisions,
}: {
  tournamentId: string;
  tournamentName: string;
  flyerUrl: string | null;
  logoUrl: string | null;
  isLead: boolean;
  currentUserId: string;
  owner: { id: string | null; name: string | null; acceptsPayments: boolean };
  admins: { id: string; name: string; email: string }[];
  detailsInitial: EventDetailsInitial;
  divisionOptions: OptionRef[];
  subdivisionOptions: OptionRef[];
  divisionRows: DivisionRow[];
  tiebreakersInitial: {
    pointsPerEvent: number | null;
    pointsPerGamePlayed: number | null;
    poolTiebreakerOrder: TiebreakerRule[];
    seedingTiebreakerOrder: TiebreakerRule[];
  };
  optionsInitial: EventOptionsInitial;
  scheduleInitial: EventScheduleInitial;
  allVenues: VenueOption[];
  attachedVenueIds: string[];
  scheduleGames: ScheduleGameRow[];
  customButtons: CustomButton[];
  contentInitial: EventContentInitial;
  alertsInitial: EventAlertsInitial;
  divisions: DivisionData[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Details");

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="display mt-1 text-2xl">{tournamentName}</h1>
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/tournaments/${tournamentId}/registrations`}
              className="text-sm text-white/70 underline hover:text-white"
            >
              Registrations &amp; refunds
            </Link>
            <Link
              href={`/admin/tournaments/${tournamentId}/rosters`}
              className="text-sm text-white/70 underline hover:text-white"
            >
              Roster approvals
            </Link>
          </div>
        </div>
        {!owner.acceptsPayments && (
          <p className="mt-2 rounded-sm bg-gold/20 px-3 py-1 text-xs font-semibold text-white">
            {owner.name
              ? `${owner.name} hasn't finished Stripe setup — this tournament can't take registration payments yet.`
              : "No organizer assigned — this tournament can't take registration payments yet."}
          </p>
        )}
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
          {activeTab === "Details" && (
            <div className="space-y-6">
              {isLead && (
                <OrganizerControl
                  tournamentId={tournamentId}
                  currentOwnerId={owner.id}
                  admins={admins}
                />
              )}
              <div className="flex flex-wrap gap-6 rounded-sm border border-steel/20 bg-white p-6">
                <LogoUpload tournamentId={tournamentId} initialLogoUrl={logoUrl} />
                <FlyerUpload tournamentId={tournamentId} initialFlyerUrl={flyerUrl} />
              </div>
              <div className="rounded-sm border border-steel/20 bg-white p-6">
                <EventDetailsForm
                  mode="edit"
                  tournamentId={tournamentId}
                  isLead={isLead}
                  admins={admins}
                  currentUserId={currentUserId}
                  currentOwnerId={owner.id}
                  initial={detailsInitial}
                />
              </div>
            </div>
          )}

          {activeTab === "Divisions" && (
            <DivisionsManager
              tournamentId={tournamentId}
              divisions={divisionRows}
              divisionOptions={divisionOptions}
              subdivisionOptions={subdivisionOptions}
            />
          )}

          {activeTab === "Tie Breakers" && (
            <TieBreakersManager tournamentId={tournamentId} initial={tiebreakersInitial} />
          )}

          {activeTab === "Options" && (
            <EventOptionsForm tournamentId={tournamentId} isLead={isLead} initial={optionsInitial} />
          )}

          {activeTab === "Schedule" && (
            <div className="space-y-6">
              <ScheduleManager
                tournamentId={tournamentId}
                allVenues={allVenues}
                attachedVenueIds={attachedVenueIds}
                games={scheduleGames}
              />
              <EventScheduleForm
                tournamentId={tournamentId}
                initial={scheduleInitial}
                customButtons={customButtons}
              />
            </div>
          )}

          {activeTab === "Content" && (
            <EventContentForm tournamentId={tournamentId} initial={contentInitial} />
          )}

          {activeTab === "Alerts" && (
            <EventAlertsForm tournamentId={tournamentId} initial={alertsInitial} />
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
