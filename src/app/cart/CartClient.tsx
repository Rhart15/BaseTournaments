"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { computeSalesTaxCents, computeProcessingFeeCents } from "@/lib/checkoutMath";

export default function CartClient() {
  const router = useRouter();
  const { items, removeItem, clear } = useCart();
  const [coachName, setCoachName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same reasoning as RegisterForm's summary: before any discount, using
  // the exact math checkout actually applies (see /lib/checkoutMath).
  const itemBreakdowns = items.map((i) => {
    const taxCents = computeSalesTaxCents(i.entryFeeCents, i.salesTaxOverridePercent);
    const feeCents = computeProcessingFeeCents(i.entryFeeCents + taxCents, i.disableProcessingFee);
    return { ...i, taxCents, feeCents, itemTotalCents: i.entryFeeCents + taxCents + feeCents };
  });
  const entryFeeCents = items.reduce((sum, i) => sum + i.entryFeeCents, 0);
  const taxCents = itemBreakdowns.reduce((sum, i) => sum + i.taxCents, 0);
  const feeCents = itemBreakdowns.reduce((sum, i) => sum + i.feeCents, 0);
  const totalCents = entryFeeCents + taxCents + feeCents;

  async function handleCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            tournamentId: i.tournamentId,
            divisionId: i.divisionId,
            teamName: i.teamName,
          })),
          coachName,
          coachEmail,
          coachPhone,
          discountCode: discountCode || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      clear();
      if (data.free) {
        router.push(`/register/success?order=${data.orderGroupId}`);
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-steel/20 bg-white p-6 text-center">
        <p className="text-ink/60">Your cart is empty.</p>
        <Link
          href="/tournaments"
          className="mt-4 inline-block rounded-sm bg-red px-6 py-3 font-semibold text-white hover:bg-red-dark"
        >
          Browse tournaments
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {itemBreakdowns.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-sm border border-steel/20 bg-white p-4"
          >
            <div>
              <p className="font-semibold">{item.teamName}</p>
              <p className="text-sm text-ink/60">
                {item.tournamentName} — {item.divisionLabel}
              </p>
              {(item.taxCents > 0 || item.feeCents > 0) && (
                <p className="text-xs text-ink/50">
                  ${(item.entryFeeCents / 100).toFixed(2)} entry
                  {item.taxCents > 0 && ` + $${(item.taxCents / 100).toFixed(2)} tax`}
                  {item.feeCents > 0 && ` + $${(item.feeCents / 100).toFixed(2)} fee`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <p className="font-semibold">
                ${(item.itemTotalCents / 100).toFixed(2)}
              </p>
              <button
                onClick={() => removeItem(item.key)}
                className="text-xs font-semibold text-ink/50 hover:text-red"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 border-t border-steel/20 pt-4">
        <div className="flex items-center justify-between text-sm text-ink/60">
          <span>Entry fees</span>
          <span>${(entryFeeCents / 100).toFixed(2)}</span>
        </div>
        {taxCents > 0 && (
          <div className="flex items-center justify-between text-sm text-ink/60">
            <span>Sales tax</span>
            <span>${(taxCents / 100).toFixed(2)}</span>
          </div>
        )}
        {feeCents > 0 && (
          <div className="flex items-center justify-between text-sm text-ink/60">
            <span>Processing fee</span>
            <span>${(feeCents / 100).toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wide text-ink/60">
            Estimated total
          </span>
          <span className="text-xl font-bold">
            ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-ink/50">
          A discount code or multi-team discount, if any, is applied to entry fees at checkout.
        </p>
      </div>

      <form onSubmit={handleCheckout} className="mt-8 space-y-4">
        <h2 className="display text-xl">Coach info</h2>
        <p className="text-sm text-ink/60">
          Used for every registration in this cart.
        </p>
        <div>
          <label className="text-sm font-medium">Coach name</label>
          <input
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            required
            minLength={2}
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Coach email</label>
          <input
            value={coachEmail}
            onChange={(e) => setCoachEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Coach phone</label>
          <input
            value={coachPhone}
            onChange={(e) => setCoachPhone(e.target.value)}
            type="tel"
            required
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Discount code (optional)</label>
          <input
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm uppercase"
            placeholder="Applies to every item in this cart"
          />
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
        >
          {submitting ? "Redirecting to payment…" : `Check out (${items.length} item${items.length === 1 ? "" : "s"})`}
        </button>
        <p className="text-center text-xs text-ink/50">
          Secure checkout powered by Stripe.
        </p>
      </form>
    </div>
  );
}
