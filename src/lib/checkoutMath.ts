// Pure checkout-math helpers with no server-only imports (no Prisma) --
// safe to import from client components (e.g. RegisterForm/CartClient) so
// the pre-payment summary can show the exact same numbers checkout will
// actually charge. Same reasoning as tiebreakers.ts's dependency-free
// design. src/lib/pricing.ts re-exports these for server-side callers.

// Sales tax on a checkout charge -- applied to the post-discount taxable
// amount (you don't tax money the customer never spent), using the
// event's own flat rate. There's no platform-wide default rate anywhere
// to fall back to, so no rate configured just means no tax.
export function computeSalesTaxCents(
  taxableCents: number,
  salesTaxOverridePercent: number | null
): number {
  if (!salesTaxOverridePercent || salesTaxOverridePercent <= 0 || taxableCents <= 0) return 0;
  return Math.round((taxableCents * salesTaxOverridePercent) / 100);
}

// Processing fee: passed through to the registrant, not absorbed by the
// tournament owner -- it offsets the real Stripe processing cost that
// `on_behalf_of` already deducts from the owner's connected-account payout
// (see /lib/connect.ts), so it's transferred to the owner along with the
// entry fee/tax, not kept by the platform as part of the flat $15 fee.
// Flat rate, not a CC-vs-eCheck split -- Stripe Checkout doesn't expose
// which payment method the customer picked until after the session is
// created, so there's no way to charge a different rate per method without
// a fully custom payment form. No per-event override exists yet (the
// wizard's "Disable processing fee" toggle is the only control) -- this
// rate is a placeholder pending real business confirmation.
export const PROCESSING_FEE_PERCENT = 3;

// Computed on the amount actually being charged (post-discount entry fee
// + tax) -- a card network's cut is taken on the full transaction total,
// tax included, not just the entry fee. The fee itself is never taxed
// (it's added last, after tax is already computed).
export function computeProcessingFeeCents(
  chargeIncludingTaxCents: number,
  disableProcessingFee: boolean
): number {
  if (disableProcessingFee || chargeIncludingTaxCents <= 0) return 0;
  return Math.round((chargeIncludingTaxCents * PROCESSING_FEE_PERCENT) / 100);
}
