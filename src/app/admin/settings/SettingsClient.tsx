"use client";

import { useState } from "react";

type Connect = {
  started: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  refreshedAt: string | null;
};

function Row({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-steel/15 py-2 text-sm last:border-0">
      <span>{label}</span>
      <span className={ok ? "font-semibold text-green-700" : "text-ink/50"}>
        {ok ? "Yes" : "Not yet"}
      </span>
    </div>
  );
}

export default function SettingsClient({
  name,
  email,
  ownedTournaments,
  mustChangePassword,
  connect,
}: {
  name: string;
  email: string;
  ownedTournaments: number;
  mustChangePassword: boolean;
  connect: Connect;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string) {
    setBusy(path);
    setError(null);
    const res = await fetch(path, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setBusy(null);
      setError(data.error ?? "Something went wrong.");
      return;
    }
    window.location.href = data.url;
  }

  // password form
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: cur, newPassword: next }),
    });
    const data = await res.json();
    setPwBusy(false);
    if (!res.ok) {
      setPwMsg(data.error ?? "Couldn't change password.");
      return;
    }
    setCur("");
    setNext("");
    setPwMsg("Password updated.");
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-sm text-ink/60">{email}</p>
        <p className="mt-1 text-xs text-ink/50">
          You own {ownedTournaments} tournament{ownedTournaments === 1 ? "" : "s"}.
        </p>
      </div>

      {mustChangePassword && (
        <p className="rounded-sm border border-gold bg-gold/10 px-3 py-2 text-sm">
          You&apos;re still on a temporary password — set a new one below.
        </p>
      )}

      {/* --- Payouts --- */}
      <section className="rounded-sm border border-steel/20 bg-white p-5">
        <h2 className="display text-lg">Stripe payouts</h2>
        <p className="mt-1 text-xs text-ink/60">
          Registration fees for tournaments you own are paid into your own
          connected Stripe account, minus the flat $15-per-team platform fee.
          Until this says “accepting payments”, your tournaments can&apos;t take
          registrations.
        </p>

        <div className="mt-4">
          <Row label="Stripe account created" ok={connect.started} />
          <Row label="Details submitted to Stripe" ok={connect.detailsSubmitted} />
          <Row label="Accepting registration payments" ok={connect.chargesEnabled} />
          <Row label="Payouts to your bank enabled" ok={connect.payoutsEnabled} />
        </div>

        {error && <p className="mt-3 text-sm text-red">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          {!connect.chargesEnabled && (
            <button
              onClick={() => go("/api/admin/connect/start")}
              disabled={busy !== null}
              className="rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
            >
              {busy === "/api/admin/connect/start"
                ? "Opening Stripe…"
                : connect.started
                ? "Continue Stripe setup"
                : "Set up payouts"}
            </button>
          )}
          {connect.started && (
            <button
              onClick={() => go("/api/admin/connect/dashboard")}
              disabled={busy !== null}
              className="rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold hover:bg-cream disabled:opacity-60"
            >
              {busy === "/api/admin/connect/dashboard" ? "Opening…" : "Open Stripe dashboard"}
            </button>
          )}
          <a
            href="/admin/settings?connect=refresh"
            className="rounded-sm px-4 py-2 text-sm font-semibold text-navy hover:underline"
          >
            Refresh status
          </a>
        </div>
        {connect.refreshedAt && (
          <p className="mt-2 text-[11px] text-ink/40">
            Last checked {new Date(connect.refreshedAt).toLocaleString()}
          </p>
        )}
      </section>

      {/* --- Password --- */}
      <section className="rounded-sm border border-steel/20 bg-white p-5">
        <h2 className="display text-lg">Change password</h2>
        <form onSubmit={changePassword} className="mt-3 space-y-3">
          <input
            type="password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            placeholder="Current password"
            required
            className="w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (8+ characters)"
            required
            minLength={8}
            className="w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          {pwMsg && (
            <p className={`text-sm ${pwMsg === "Password updated." ? "text-green-700" : "text-red"}`}>
              {pwMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={pwBusy}
            className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pwBusy ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
