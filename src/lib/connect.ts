import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// Flat platform fee kept by BASE on every paid team registration. Taken
// as a Stripe application fee on the charge (destination charge), so the
// tournament owner's connected account receives the entry fee minus this.
// For a payment plan it is taken once, on the first installment.
export const PLATFORM_FEE_CENTS = 1500;

/** The site origin for Stripe redirect URLs. */
export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/**
 * Returns the admin's Stripe Connect (Express) account id, creating the
 * account on first call. The account starts with no capabilities enabled
 * -- the admin must complete onboarding (accountLinks) before charges
 * can be routed to it.
 */
export async function getOrCreateConnectAccount(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    email: user.email,
    business_type: "individual",
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    business_profile: {
      name: user.name,
      product_description: "Youth baseball/softball tournament registration fees.",
    },
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectAccountId: account.id },
  });
  return account.id;
}

/** A one-time onboarding link the admin follows to finish KYC with Stripe. */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const origin = siteOrigin();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/settings?connect=refresh`,
    return_url: `${origin}/admin/settings?connect=return`,
    type: "account_onboarding",
  });
  return link.url;
}

/** A short-lived link into the Express dashboard (payout history, etc.). */
export async function createDashboardLink(accountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

export type ConnectStatus = {
  hasAccount: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  refreshedAt: Date | null;
};

/** Writes the current Stripe account state onto the owning user row. */
export async function persistAccountStatus(account: Stripe.Account): Promise<void> {
  const userId = account.metadata?.userId;
  if (!userId) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeConnectChargesEnabled: account.charges_enabled ?? false,
      stripeConnectPayoutsEnabled: account.payouts_enabled ?? false,
      stripeConnectDetailsSubmitted: account.details_submitted ?? false,
      stripeConnectRefreshedAt: new Date(),
    },
  });
}

/** Pulls fresh account state from Stripe and caches it on the user row. */
export async function refreshConnectStatus(userId: string): Promise<ConnectStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeConnectAccountId) {
    return {
      hasAccount: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      refreshedAt: null,
    };
  }
  const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
  await persistAccountStatus(account);
  return {
    hasAccount: true,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    refreshedAt: new Date(),
  };
}

export type TournamentPayout =
  | { ok: true; destination: string; ownerId: string }
  | { ok: false; reason: string };

/**
 * Resolves where a registration payment for this tournament should go.
 * Fails (blocking checkout) when the tournament has no owner, or the
 * owner hasn't finished Stripe onboarding.
 */
export async function resolveTournamentPayout(
  tournamentId: string
): Promise<TournamentPayout> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      ownerId: true,
      owner: {
        select: {
          stripeConnectAccountId: true,
          stripeConnectChargesEnabled: true,
        },
      },
    },
  });
  if (!t) return { ok: false, reason: "Tournament not found." };
  if (!t.ownerId || !t.owner) {
    return { ok: false, reason: "This tournament doesn't have an organizer assigned yet." };
  }
  if (!t.owner.stripeConnectAccountId || !t.owner.stripeConnectChargesEnabled) {
    return {
      ok: false,
      reason: "This tournament isn't set up to accept registration payments yet.",
    };
  }
  return { ok: true, destination: t.owner.stripeConnectAccountId, ownerId: t.ownerId };
}

/** Clamp the platform fee so it never exceeds a small charge. */
export function feeFor(chargeCents: number): number {
  return Math.max(0, Math.min(PLATFORM_FEE_CENTS, chargeCents));
}
