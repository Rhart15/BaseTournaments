import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession, isLeadAdmin, canManageTournament } from "@/lib/adminAuth";
import AdminTournamentTabs from "./AdminTournamentTabs";

export const dynamic = "force-dynamic";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getAdminSession();
  if (!session) redirect(`/login?next=/admin/tournaments/${id}`);
  const lead = isLeadAdmin(session);

  // A regular admin can't even see a tournament they don't own.
  if (!(await canManageTournament(id, session))) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, stripeConnectChargesEnabled: true } },
      divisions: {
        orderBy: { sortOrder: "asc" },
        include: {
          registrations: true,
          games: { include: { homeTeam: true, awayTeam: true } },
          divisionOption: true,
          subdivisionOption: true,
        },
      },
      customButtons: { orderBy: { sortOrder: "asc" } },
      tournamentVenues: true,
    },
  });

  if (!tournament) notFound();

  const allVenues = await prisma.venue.findMany({ orderBy: { name: "asc" } });

  const admins = lead
    ? await prisma.user.findMany({
        where: { role: "ADMIN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  const [divisionOptions, subdivisionOptions] = await Promise.all([
    prisma.divisionOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subdivisionOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const divisions = tournament.divisions.map((division) => {
    const poolGames = division.games.filter((g) => g.stage === "POOL");
    const bracketGames = division.games.filter((g) => g.stage === "BRACKET");
    const allPoolGamesFinal =
      poolGames.length > 0 && poolGames.every((g) => g.status === "FINAL");

    return {
      id: division.id,
      label: division.label,
      resultsFinalized: division.resultsFinalized,
      bracketPublished: division.bracketPublished,
      usePoolPlay: division.usePoolPlay,
      gameGuarantee: division.gameGuarantee,
      poolGames,
      bracketGames,
      allPoolGamesFinal,
      registeredCount: division.registrations.filter(
        (r) => r.status !== "CANCELLED" && r.status !== "REFUNDED"
      ).length,
    };
  });

  const toLocalDateTime = (d: Date | null) =>
    d
      ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : "";

  return (
    <AdminTournamentTabs
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      flyerUrl={tournament.flyerUrl}
      logoUrl={tournament.logoUrl}
      isLead={lead}
      currentUserId={session.user.id}
      owner={{
        id: tournament.owner?.id ?? null,
        name: tournament.owner?.name ?? null,
        acceptsPayments: Boolean(tournament.owner?.stripeConnectChargesEnabled),
      }}
      admins={admins}
      detailsInitial={{
        name: tournament.name,
        season: tournament.season ?? "",
        sport: tournament.sport,
        eventType: tournament.eventType,
        entryType: tournament.entryType,
        status: tournament.status,
        featured: tournament.featured,
        startDate: tournament.startDate.toISOString().slice(0, 10),
        endDate: tournament.endDate.toISOString().slice(0, 10),
        dailyStartTime: tournament.dailyStartTime ?? "",
        dailyEndTime: tournament.dailyEndTime ?? "",
        registrationOpensAt: toLocalDateTime(tournament.registrationOpensAt),
        registrationClosesAt: toLocalDateTime(tournament.registrationClosesAt),
        registrationStatus: tournament.registrationStatus,
        city: tournament.city,
        state: tournament.state,
        address: tournament.address ?? "",
        displayLocation: tournament.displayLocation ?? "",
        slug: tournament.slug ?? "",
        entryFeeDollars: tournament.entryFeeCents / 100,
        teamCap: tournament.teamCap,
        description: tournament.description ?? "",
        staffTags: tournament.staffTags.join(", "),
        showFlyerInsteadOfLogo: tournament.showFlyerInsteadOfLogo,
      }}
      divisionOptions={divisionOptions.map((o) => ({ id: o.id, label: o.label }))}
      subdivisionOptions={subdivisionOptions.map((o) => ({ id: o.id, label: o.label }))}
      divisionRows={tournament.divisions.map((d) => ({
        id: d.id,
        label: d.label,
        divisionOptionId: d.divisionOptionId,
        divisionOptionLabel: d.divisionOption?.label ?? null,
        subdivisionOptionId: d.subdivisionOptionId,
        subdivisionOptionLabel: d.subdivisionOption?.label ?? null,
        publicLabelOverride: d.publicLabelOverride,
        priceDollars: d.priceCents !== null ? d.priceCents / 100 : null,
        teamCap: d.teamCap,
        gameTimeLimitMinutes: d.gameTimeLimitMinutes,
        breakMinutes: d.breakMinutes,
        format: d.format,
        colorTag: d.colorTag,
        waitlistEnabled: d.waitlistEnabled,
        ghostTeamsCount: d.ghostTeamsCount,
        leagueGamesCount: d.leagueGamesCount,
        maxRD: d.maxRD,
        genderFilter: d.genderFilter,
        specialPriceDollars: d.specialPriceCents !== null ? d.specialPriceCents / 100 : null,
        specialPriceCutoffDate: d.specialPriceCutoffDate
          ? d.specialPriceCutoffDate.toISOString().slice(0, 10)
          : "",
        addressOverride: d.addressOverride,
        postalCodeOverride: d.postalCodeOverride,
        showRegistration: d.showRegistration,
        showTeamsAttending: d.showTeamsAttending,
        showWaitlist: d.showWaitlist,
        showPoolStandings: d.showPoolStandings,
        showDivisionStandings: d.showDivisionStandings,
        showOverallStandings: d.showOverallStandings,
        showSchedule: d.showSchedule,
        showResults: d.showResults,
      }))}
      tiebreakersInitial={{
        pointsPerEvent: tournament.pointsPerEvent,
        pointsPerGamePlayed: tournament.pointsPerGamePlayed,
        poolTiebreakerOrder: tournament.poolTiebreakerOrder,
        seedingTiebreakerOrder: tournament.seedingTiebreakerOrder,
      }}
      optionsInitial={{
        guestPlayerLimit: tournament.guestPlayerLimit,
        guestPlayerLimitHigherLevel: tournament.guestPlayerLimitHigherLevel,
        freezeRoster: tournament.freezeRoster,
        acceptRostersAfterStart: tournament.acceptRostersAfterStart,
        rosterDeadlineAt: tournament.rosterDeadlineAt
          ? tournament.rosterDeadlineAt.toISOString().slice(0, 10)
          : "",
        disableCheckPayLater: tournament.disableCheckPayLater,
        disableECheck: tournament.disableECheck,
        disableCreditCard: tournament.disableCreditCard,
        disableProcessingFee: tournament.disableProcessingFee,
        addToCartText: tournament.addToCartText ?? "",
        depositType: tournament.depositType ?? "",
        depositAmount: tournament.depositAmount,
        salesTaxOverridePercent: tournament.salesTaxOverridePercent,
        eventPasswordSet: tournament.eventPasswordHash !== null,
        showEventForms: tournament.showEventForms,
        showTeamsAttending: tournament.showTeamsAttending,
        showWaitlistedTeams: tournament.showWaitlistedTeams,
        showTeamAssignedInPlayerDashboard: tournament.showTeamAssignedInPlayerDashboard,
        showTeamsAttendingRosters: tournament.showTeamsAttendingRosters,
        showFinalResults: tournament.showFinalResults,
        disableRosterNotifications: tournament.disableRosterNotifications,
        hideTeamsAttendingLocation: tournament.hideTeamsAttendingLocation,
        hideVenues: tournament.hideVenues,
        hideRules: tournament.hideRules,
        showRosterOnTeamSchedule: tournament.showRosterOnTeamSchedule,
        showRosterCountOnTeamsAttending: tournament.showRosterCountOnTeamsAttending,
        teamsAttendingDescription: tournament.teamsAttendingDescription ?? "",
        gameGuaranteeText: tournament.gameGuaranteeText ?? "",
        awardsText: tournament.awardsText ?? "",
        batType: tournament.batType ?? "",
        fieldType: tournament.fieldType ?? "",
        genderLabel: tournament.genderLabel ?? "",
        divisionLabelOverride: tournament.divisionLabelOverride ?? "",
        costLabelOverride: tournament.costLabelOverride ?? "",
        specialPriceLabelOverride: tournament.specialPriceLabelOverride ?? "",
        stayToPlay: tournament.stayToPlay,
        productsEnabled: tournament.productsEnabled,
        productsSalesTaxPercent: tournament.productsSalesTaxPercent,
        ticketsEnabled: tournament.ticketsEnabled,
        ticketsSalesTaxPercent: tournament.ticketsSalesTaxPercent,
        ticketsExternalLinkEnabled: tournament.ticketsExternalLinkEnabled,
        ticketsExternalUrl: tournament.ticketsExternalUrl ?? "",
        ticketsButtonBgColor: tournament.ticketsButtonBgColor ?? "",
        ticketsButtonTextColor: tournament.ticketsButtonTextColor ?? "",
        scheduleRequestEnabledAtCheckout: tournament.scheduleRequestEnabledAtCheckout,
        scheduleRequestEnabledInDashboard: tournament.scheduleRequestEnabledInDashboard,
        scheduleRequestMaxPerTeam: tournament.scheduleRequestMaxPerTeam,
        scheduleRequestInstructions: tournament.scheduleRequestInstructions ?? "",
      }}
      scheduleInitial={{
        hideSchedule: tournament.hideSchedule,
        scheduleIntervalMinutes: tournament.scheduleIntervalMinutes,
        maxGamesPerDay: tournament.maxGamesPerDay,
        coachSelfSchedulingEnabled: tournament.coachSelfSchedulingEnabled,
        coachSelfScoringEnabled: tournament.coachSelfScoringEnabled,
        poolToPoolEvent: tournament.poolToPoolEvent,
        scheduleNotesWhenShown: tournament.scheduleNotesWhenShown ?? "",
        scheduleNotesWhenHidden: tournament.scheduleNotesWhenHidden ?? "",
        payPerGameEnabled: tournament.payPerGameEnabled,
        payPerGameIncludedGames: tournament.payPerGameIncludedGames,
        payPerGameMaxPerDay: tournament.payPerGameMaxPerDay,
        payPerGamePriceDollars:
          tournament.payPerGamePriceCents !== null ? tournament.payPerGamePriceCents / 100 : null,
        payPerGameRequestEnabledInDashboard: tournament.payPerGameRequestEnabledInDashboard,
        paidPracticeEnabled: tournament.paidPracticeEnabled,
        paidPracticeMaxSessions: tournament.paidPracticeMaxSessions,
        paidPracticeDurationMinutes: tournament.paidPracticeDurationMinutes,
        paidPracticePriceDollars:
          tournament.paidPracticePriceCents !== null ? tournament.paidPracticePriceCents / 100 : null,
      }}
      allVenues={allVenues.map((v) => ({ id: v.id, name: v.name, fieldCount: v.fieldCount }))}
      attachedVenueIds={tournament.tournamentVenues.map((tv) => tv.venueId)}
      scheduleGames={tournament.divisions.flatMap((division) =>
        division.games.map((game) => ({
          id: game.id,
          divisionId: division.id,
          divisionLabel: division.label,
          stage: game.stage,
          round: game.round,
          homeTeamName: game.homeTeam?.teamName ?? null,
          awayTeamName: game.awayTeam?.teamName ?? null,
          venueId: game.venueId,
          fieldNumber: game.fieldNumber,
          startTime: game.startTime ? game.startTime.toISOString() : null,
          scheduleLocked: game.scheduleLocked,
        }))
      )}
      customButtons={tournament.customButtons.map((b) => ({ id: b.id, text: b.text, url: b.url }))}
      contentInitial={{
        description: tournament.description ?? "",
        additionalContent: tournament.additionalContent ?? "",
      }}
      alertsInitial={{
        weatherAlertButtonLabel: tournament.weatherAlertButtonLabel ?? "",
        weatherAlertContent: tournament.weatherAlertContent ?? "",
        eventAlertButtonLabel: tournament.eventAlertButtonLabel ?? "",
        eventAlertMessage: tournament.eventAlertMessage ?? "",
      }}
      divisions={divisions}
    />
  );
}
