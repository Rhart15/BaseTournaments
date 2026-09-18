import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { guardTournament, isLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ensureUniqueSlug, slugify } from "@/lib/eventSlug";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = await req.json();
  const {
    name,
    sport,
    startDate,
    endDate,
    city,
    state,
    entryFeeDollars,
    teamCap,
    description,
    ownerId,
    // --- Event wizard: Details ---
    season,
    eventType,
    entryType,
    status,
    featured,
    dailyStartTime,
    dailyEndTime,
    registrationOpensAt,
    registrationClosesAt,
    registrationStatus,
    address,
    displayLocation,
    slug: requestedSlug,
    showFlyerInsteadOfLogo,
    staffTags,
    // --- Event wizard: Tie Breakers ---
    pointsPerEvent,
    pointsPerGamePlayed,
    poolTiebreakerOrder,
    seedingTiebreakerOrder,
    // --- Event wizard: Options ---
    guestPlayerLimit,
    guestPlayerLimitHigherLevel,
    freezeRoster,
    acceptRostersAfterStart,
    rosterDeadlineAt,
    disableCheckPayLater,
    disableECheck,
    disableCreditCard,
    disableProcessingFee,
    addToCartText,
    depositType,
    depositAmount,
    salesTaxOverridePercent,
    eventPassword,
    showEventForms,
    showTeamsAttending,
    showWaitlistedTeams,
    showTeamAssignedInPlayerDashboard,
    showTeamsAttendingRosters,
    showFinalResults,
    disableRosterNotifications,
    hideTeamsAttendingLocation,
    hideVenues,
    hideRules,
    showRosterOnTeamSchedule,
    showRosterCountOnTeamsAttending,
    teamsAttendingDescription,
    gameGuaranteeText,
    awardsText,
    batType,
    fieldType,
    genderLabel,
    divisionLabelOverride,
    costLabelOverride,
    specialPriceLabelOverride,
    stayToPlay,
    productsEnabled,
    productsSalesTaxPercent,
    ticketsEnabled,
    ticketsSalesTaxPercent,
    ticketsExternalLinkEnabled,
    ticketsExternalUrl,
    ticketsButtonBgColor,
    ticketsButtonTextColor,
    scheduleRequestEnabledAtCheckout,
    scheduleRequestEnabledInDashboard,
    scheduleRequestMaxPerTeam,
    scheduleRequestInstructions,
    // --- Event wizard: Schedule ---
    hideSchedule,
    scheduleIntervalMinutes,
    maxGamesPerDay,
    coachSelfSchedulingEnabled,
    coachSelfScoringEnabled,
    poolToPoolEvent,
    scheduleNotesWhenShown,
    scheduleNotesWhenHidden,
    payPerGameEnabled,
    payPerGameIncludedGames,
    payPerGameMaxPerDay,
    payPerGamePriceDollars,
    payPerGameRequestEnabledInDashboard,
    paidPracticeEnabled,
    paidPracticeMaxSessions,
    paidPracticeDurationMinutes,
    paidPracticePriceDollars,
    // --- Event wizard: Content ---
    additionalContent,
    // --- Event wizard: Alerts ---
    weatherAlertButtonLabel,
    weatherAlertContent,
    eventAlertButtonLabel,
    eventAlertMessage,
  } = body;

  // Sales tax and event-password protection are lead-admin-only fields
  // (item #6 of the admin hierarchy design) -- a regular admin can edit
  // every other Options field on a tournament they own, but not these.
  if (
    (salesTaxOverridePercent !== undefined || eventPassword !== undefined) &&
    !isLeadAdmin(g.session)
  ) {
    return NextResponse.json(
      { error: "Only a lead admin can change sales tax or event password protection." },
      { status: 403 }
    );
  }

  let eventPasswordHash: string | null | undefined;
  if (eventPassword !== undefined) {
    eventPasswordHash = eventPassword ? await bcrypt.hash(String(eventPassword), 10) : null;
  }

  const toIntOrNull = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));

  // Reassigning the organizer is a lead-admin-only action.
  if (ownerId !== undefined) {
    if (!isLeadAdmin(g.session)) {
      return NextResponse.json(
        { error: "Only a lead admin can change a tournament's organizer." },
        { status: 403 }
      );
    }
    const target = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!target || target.role !== "ADMIN") {
      return NextResponse.json(
        { error: "The chosen organizer isn't an admin account." },
        { status: 400 }
      );
    }
  }

  let slug: string | undefined;
  if (requestedSlug !== undefined) {
    slug = await ensureUniqueSlug(prisma, slugify(String(requestedSlug)), id);
  }

  const TIEBREAKER_RULES = [
    "HEAD_TO_HEAD",
    "RUN_DIFFERENTIAL",
    "RUNS_ALLOWED",
    "RUNS_SCORED",
    "FEWEST_LOSSES",
    "FORFEIT_RECORD",
    "STRENGTH_OF_SCHEDULE",
    "COIN_FLIP",
  ];
  for (const [key, value] of [
    ["poolTiebreakerOrder", poolTiebreakerOrder],
    ["seedingTiebreakerOrder", seedingTiebreakerOrder],
  ] as const) {
    if (value !== undefined && (!Array.isArray(value) || !value.every((r) => TIEBREAKER_RULES.includes(r)))) {
      return NextResponse.json({ error: `${key} must be an array of valid tiebreaker rules.` }, { status: 400 });
    }
  }

  const tags: string[] | undefined =
    staffTags !== undefined
      ? String(staffTags)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : undefined;

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sport !== undefined && { sport }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(entryFeeDollars !== undefined && {
        entryFeeCents: Math.round(Number(entryFeeDollars) * 100),
      }),
      ...(teamCap !== undefined && { teamCap: Number(teamCap) }),
      ...(description !== undefined && { description: description || null }),
      ...(ownerId !== undefined && { ownerId }),
      ...(season !== undefined && { season: season || null }),
      ...(eventType !== undefined && { eventType }),
      ...(entryType !== undefined && { entryType }),
      ...(status !== undefined && { status }),
      ...(featured !== undefined && { featured: Boolean(featured) }),
      ...(dailyStartTime !== undefined && { dailyStartTime: dailyStartTime || null }),
      ...(dailyEndTime !== undefined && { dailyEndTime: dailyEndTime || null }),
      ...(registrationOpensAt !== undefined && {
        registrationOpensAt: registrationOpensAt ? new Date(registrationOpensAt) : null,
      }),
      ...(registrationClosesAt !== undefined && {
        registrationClosesAt: registrationClosesAt ? new Date(registrationClosesAt) : null,
      }),
      ...(registrationStatus !== undefined && { registrationStatus }),
      ...(address !== undefined && { address: address || null }),
      ...(displayLocation !== undefined && { displayLocation: displayLocation || null }),
      ...(slug !== undefined && { slug }),
      ...(showFlyerInsteadOfLogo !== undefined && {
        showFlyerInsteadOfLogo: Boolean(showFlyerInsteadOfLogo),
      }),
      ...(tags !== undefined && { staffTags: tags }),
      ...(pointsPerEvent !== undefined && {
        pointsPerEvent: pointsPerEvent === null || pointsPerEvent === "" ? null : Number(pointsPerEvent),
      }),
      ...(pointsPerGamePlayed !== undefined && {
        pointsPerGamePlayed:
          pointsPerGamePlayed === null || pointsPerGamePlayed === "" ? null : Number(pointsPerGamePlayed),
      }),
      ...(poolTiebreakerOrder !== undefined && { poolTiebreakerOrder }),
      ...(seedingTiebreakerOrder !== undefined && { seedingTiebreakerOrder }),

      // Roster rules
      ...(guestPlayerLimit !== undefined && { guestPlayerLimit: toIntOrNull(guestPlayerLimit) }),
      ...(guestPlayerLimitHigherLevel !== undefined && {
        guestPlayerLimitHigherLevel: toIntOrNull(guestPlayerLimitHigherLevel),
      }),
      ...(freezeRoster !== undefined && { freezeRoster: Boolean(freezeRoster) }),
      ...(acceptRostersAfterStart !== undefined && {
        acceptRostersAfterStart: Boolean(acceptRostersAfterStart),
      }),
      ...(rosterDeadlineAt !== undefined && {
        rosterDeadlineAt: rosterDeadlineAt ? new Date(rosterDeadlineAt) : null,
      }),

      // Checkout / payments
      ...(disableCheckPayLater !== undefined && {
        disableCheckPayLater: Boolean(disableCheckPayLater),
      }),
      ...(disableECheck !== undefined && { disableECheck: Boolean(disableECheck) }),
      ...(disableCreditCard !== undefined && { disableCreditCard: Boolean(disableCreditCard) }),
      ...(disableProcessingFee !== undefined && {
        disableProcessingFee: Boolean(disableProcessingFee),
      }),
      ...(addToCartText !== undefined && { addToCartText: addToCartText || null }),
      ...(depositType !== undefined && { depositType: depositType || null }),
      ...(depositAmount !== undefined && { depositAmount: toIntOrNull(depositAmount) }),
      ...(salesTaxOverridePercent !== undefined && {
        salesTaxOverridePercent:
          salesTaxOverridePercent === null || salesTaxOverridePercent === ""
            ? null
            : Number(salesTaxOverridePercent),
      }),
      ...(eventPasswordHash !== undefined && { eventPasswordHash }),
      ...(showEventForms !== undefined && { showEventForms: Boolean(showEventForms) }),

      // Display / teams & players
      ...(showTeamsAttending !== undefined && { showTeamsAttending: Boolean(showTeamsAttending) }),
      ...(showWaitlistedTeams !== undefined && {
        showWaitlistedTeams: Boolean(showWaitlistedTeams),
      }),
      ...(showTeamAssignedInPlayerDashboard !== undefined && {
        showTeamAssignedInPlayerDashboard: Boolean(showTeamAssignedInPlayerDashboard),
      }),
      ...(showTeamsAttendingRosters !== undefined && {
        showTeamsAttendingRosters: Boolean(showTeamsAttendingRosters),
      }),
      ...(showFinalResults !== undefined && { showFinalResults: Boolean(showFinalResults) }),
      ...(disableRosterNotifications !== undefined && {
        disableRosterNotifications: Boolean(disableRosterNotifications),
      }),
      ...(hideTeamsAttendingLocation !== undefined && {
        hideTeamsAttendingLocation: Boolean(hideTeamsAttendingLocation),
      }),
      ...(hideVenues !== undefined && { hideVenues: Boolean(hideVenues) }),
      ...(hideRules !== undefined && { hideRules: Boolean(hideRules) }),
      ...(showRosterOnTeamSchedule !== undefined && {
        showRosterOnTeamSchedule: Boolean(showRosterOnTeamSchedule),
      }),
      ...(showRosterCountOnTeamsAttending !== undefined && {
        showRosterCountOnTeamsAttending: Boolean(showRosterCountOnTeamsAttending),
      }),
      ...(teamsAttendingDescription !== undefined && {
        teamsAttendingDescription: teamsAttendingDescription || null,
      }),

      // Bullet points & labels
      ...(gameGuaranteeText !== undefined && { gameGuaranteeText: gameGuaranteeText || null }),
      ...(awardsText !== undefined && { awardsText: awardsText || null }),
      ...(batType !== undefined && { batType: batType || null }),
      ...(fieldType !== undefined && { fieldType: fieldType || null }),
      ...(genderLabel !== undefined && { genderLabel: genderLabel || null }),
      ...(divisionLabelOverride !== undefined && {
        divisionLabelOverride: divisionLabelOverride || null,
      }),
      ...(costLabelOverride !== undefined && { costLabelOverride: costLabelOverride || null }),
      ...(specialPriceLabelOverride !== undefined && {
        specialPriceLabelOverride: specialPriceLabelOverride || null,
      }),
      ...(stayToPlay !== undefined && { stayToPlay: Boolean(stayToPlay) }),

      // Products & tickets
      ...(productsEnabled !== undefined && { productsEnabled: Boolean(productsEnabled) }),
      ...(productsSalesTaxPercent !== undefined && {
        productsSalesTaxPercent:
          productsSalesTaxPercent === null || productsSalesTaxPercent === ""
            ? null
            : Number(productsSalesTaxPercent),
      }),
      ...(ticketsEnabled !== undefined && { ticketsEnabled: Boolean(ticketsEnabled) }),
      ...(ticketsSalesTaxPercent !== undefined && {
        ticketsSalesTaxPercent:
          ticketsSalesTaxPercent === null || ticketsSalesTaxPercent === ""
            ? null
            : Number(ticketsSalesTaxPercent),
      }),
      ...(ticketsExternalLinkEnabled !== undefined && {
        ticketsExternalLinkEnabled: Boolean(ticketsExternalLinkEnabled),
      }),
      ...(ticketsExternalUrl !== undefined && { ticketsExternalUrl: ticketsExternalUrl || null }),
      ...(ticketsButtonBgColor !== undefined && {
        ticketsButtonBgColor: ticketsButtonBgColor || null,
      }),
      ...(ticketsButtonTextColor !== undefined && {
        ticketsButtonTextColor: ticketsButtonTextColor || null,
      }),

      // Schedule requests
      ...(scheduleRequestEnabledAtCheckout !== undefined && {
        scheduleRequestEnabledAtCheckout: Boolean(scheduleRequestEnabledAtCheckout),
      }),
      ...(scheduleRequestEnabledInDashboard !== undefined && {
        scheduleRequestEnabledInDashboard: Boolean(scheduleRequestEnabledInDashboard),
      }),
      ...(scheduleRequestMaxPerTeam !== undefined && {
        scheduleRequestMaxPerTeam: toIntOrNull(scheduleRequestMaxPerTeam),
      }),
      ...(scheduleRequestInstructions !== undefined && {
        scheduleRequestInstructions: scheduleRequestInstructions || null,
      }),

      // Schedule
      ...(hideSchedule !== undefined && { hideSchedule: Boolean(hideSchedule) }),
      ...(scheduleIntervalMinutes !== undefined && {
        scheduleIntervalMinutes: Number(scheduleIntervalMinutes),
      }),
      ...(maxGamesPerDay !== undefined && { maxGamesPerDay: toIntOrNull(maxGamesPerDay) }),
      ...(coachSelfSchedulingEnabled !== undefined && {
        coachSelfSchedulingEnabled: Boolean(coachSelfSchedulingEnabled),
      }),
      ...(coachSelfScoringEnabled !== undefined && {
        coachSelfScoringEnabled: Boolean(coachSelfScoringEnabled),
      }),
      ...(poolToPoolEvent !== undefined && { poolToPoolEvent: Boolean(poolToPoolEvent) }),
      ...(scheduleNotesWhenShown !== undefined && {
        scheduleNotesWhenShown: scheduleNotesWhenShown || null,
      }),
      ...(scheduleNotesWhenHidden !== undefined && {
        scheduleNotesWhenHidden: scheduleNotesWhenHidden || null,
      }),
      ...(payPerGameEnabled !== undefined && { payPerGameEnabled: Boolean(payPerGameEnabled) }),
      ...(payPerGameIncludedGames !== undefined && {
        payPerGameIncludedGames: toIntOrNull(payPerGameIncludedGames),
      }),
      ...(payPerGameMaxPerDay !== undefined && {
        payPerGameMaxPerDay: toIntOrNull(payPerGameMaxPerDay),
      }),
      ...(payPerGamePriceDollars !== undefined && {
        payPerGamePriceCents:
          payPerGamePriceDollars === null || payPerGamePriceDollars === ""
            ? null
            : Math.round(Number(payPerGamePriceDollars) * 100),
      }),
      ...(payPerGameRequestEnabledInDashboard !== undefined && {
        payPerGameRequestEnabledInDashboard: Boolean(payPerGameRequestEnabledInDashboard),
      }),
      ...(paidPracticeEnabled !== undefined && {
        paidPracticeEnabled: Boolean(paidPracticeEnabled),
      }),
      ...(paidPracticeMaxSessions !== undefined && {
        paidPracticeMaxSessions: toIntOrNull(paidPracticeMaxSessions),
      }),
      ...(paidPracticeDurationMinutes !== undefined && {
        paidPracticeDurationMinutes: toIntOrNull(paidPracticeDurationMinutes),
      }),
      ...(paidPracticePriceDollars !== undefined && {
        paidPracticePriceCents:
          paidPracticePriceDollars === null || paidPracticePriceDollars === ""
            ? null
            : Math.round(Number(paidPracticePriceDollars) * 100),
      }),

      // Content
      ...(additionalContent !== undefined && { additionalContent: additionalContent || null }),

      // Alerts
      ...(weatherAlertButtonLabel !== undefined && {
        weatherAlertButtonLabel: weatherAlertButtonLabel || null,
      }),
      ...(weatherAlertContent !== undefined && {
        weatherAlertContent: weatherAlertContent || null,
      }),
      ...(eventAlertButtonLabel !== undefined && {
        eventAlertButtonLabel: eventAlertButtonLabel || null,
      }),
      ...(eventAlertMessage !== undefined && { eventAlertMessage: eventAlertMessage || null }),
    },
  });

  return NextResponse.json({ tournament });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const g = await guardTournament(id);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  await prisma.tournament.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
