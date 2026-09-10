"use client";

import { useState } from "react";

// Shown at the top of the admin dashboard. Nudges an admin to finish
// Stripe Connect onboarding so their tournaments can take registrations.
export default function PayoutStatusBanner({
  started,
  chargesEnabled,
  payoutsEnabled,
}: {
  started: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (chargesEnabled && payoutsEnabled) return null;

  async function startOnboarding() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/connect/start", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setBusy(false);
      setError(data.error ?? "Couldn't start Stripe setup.");
      return;
    }
    window.location.href = data.url;
  }

  const headline = !started
    ? "Set up payouts to start accepting registrations"
    : !chargesEnabled
    ? "Finish your Stripe setup to accept registration payments"
    : "Stripe needs a bit more info before it can pay you out";

  return (
    <div className="rounded-sm border border-gold bg-gold/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{headline}</p>
          <p className="mt-1 text-xs text-ink/60">
            Registration fees for the tournaments you own are paid into your
            own connected Stripe account, minus the $15-per-team platform fee.
          </p>
          {error && <p className="mt-1 text-xs text-red">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={startOnboarding}
            disabled={busy}
            className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
          >
            {busy ? "Opening Stripe…" : started ? "Continue setup" : "Set up payouts"}
          </button>
          <a href="/admin/settings" className="text-xs font-semibold text-navy hover:underline">
            Details
          </a>
        </div>
      </div>
    </div>
  );
}
