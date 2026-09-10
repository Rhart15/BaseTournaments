"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Admin = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  connectStarted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  ownedTournaments: number;
};

function ConnectPill({ a }: { a: Admin }) {
  const label = a.chargesEnabled
    ? "Payouts ready"
    : a.connectStarted
    ? "Onboarding incomplete"
    : "Not started";
  const cls = a.chargesEnabled
    ? "bg-green-100 text-green-800"
    : a.connectStarted
    ? "bg-gold/20 text-ink/70"
    : "bg-steel/20 text-ink/60";
  return <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>{label}</span>;
}

export default function AdminsClient({
  admins: initialAdmins,
  currentUserId,
}: {
  admins: Admin[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [admins, setAdmins] = useState(initialAdmins);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  // create form
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cLead, setCLead] = useState(false);
  const [cBusy, setCBusy] = useState(false);

  // promote form
  const [pEmail, setPEmail] = useState("");
  const [pBusy, setPBusy] = useState(false);

  // reassign-on-remove
  const [removing, setRemoving] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");

  function refresh() {
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCBusy(true);
    setError(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create", name: cName, email: cEmail, isSuperAdmin: cLead }),
    });
    const data = await res.json();
    setCBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't create the account.");
      return;
    }
    setAdmins((prev) => [
      ...prev,
      {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isSuperAdmin: data.user.isSuperAdmin,
        mustChangePassword: true,
        connectStarted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        ownedTournaments: 0,
      },
    ]);
    setTempPassword({ email: data.user.email, password: data.tempPassword });
    setCName("");
    setCEmail("");
    setCLead(false);
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    setPBusy(true);
    setError(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "promote", email: pEmail }),
    });
    const data = await res.json();
    setPBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't promote that account.");
      return;
    }
    setPEmail("");
    refresh();
  }

  async function toggleLead(a: Admin) {
    setError(null);
    const res = await fetch(`/api/admin/admins/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSuperAdmin: !a.isSuperAdmin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't change that.");
      return;
    }
    setAdmins((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, isSuperAdmin: !a.isSuperAdmin } : x))
    );
  }

  async function resetPassword(a: Admin) {
    setError(null);
    const res = await fetch(`/api/admin/admins/${a.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't reset the password.");
      return;
    }
    setTempPassword({ email: a.email, password: data.tempPassword });
  }

  async function remove(a: Admin, reassign?: string) {
    setError(null);
    const qs = reassign ? `?reassignTo=${encodeURIComponent(reassign)}` : "";
    const res = await fetch(`/api/admin/admins/${a.id}${qs}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAdmins((prev) => prev.filter((x) => x.id !== a.id));
      setRemoving(null);
      setReassignTo("");
      refresh();
      return;
    }
    if (data.needsReassign) {
      setRemoving(a.id);
      return;
    }
    setError(data.error ?? "Couldn't remove that admin.");
  }

  const otherAdmins = admins.filter((a) => a.id !== removing);

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink/60">
        Regular admins can create and manage only the tournaments they own.
        Lead admins can manage every tournament on the site, reassign
        organizers, and manage this list.
      </p>

      {tempPassword && (
        <div className="rounded-sm border border-gold bg-gold/10 p-4">
          <p className="text-sm font-semibold">One-time password for {tempPassword.email}</p>
          <p className="mt-1 text-xs text-ink/60">
            Shown once — copy it now and send it to them securely. They&apos;ll be
            asked to change it after signing in.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded-sm bg-white px-3 py-1.5 text-sm">{tempPassword.password}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(tempPassword.password)}
              className="text-xs font-semibold text-red hover:text-red-dark"
            >
              Copy
            </button>
            <button
              onClick={() => setTempPassword(null)}
              className="text-xs text-ink/50 hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-sm bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.id} className="rounded-sm border border-steel/20 bg-white px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-semibold">{a.name}</span>
                {a.isSuperAdmin && (
                  <span className="ml-2 rounded-sm bg-navy px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Lead admin
                  </span>
                )}
                {a.id === currentUserId && (
                  <span className="ml-2 text-[10px] uppercase text-ink/40">you</span>
                )}
                <p className="text-ink/60">{a.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <ConnectPill a={a} />
                  <span className="text-[11px] text-ink/50">
                    {a.ownedTournaments} tournament{a.ownedTournaments === 1 ? "" : "s"} owned
                  </span>
                  {a.mustChangePassword && (
                    <span className="text-[11px] text-gold">hasn&apos;t set a password yet</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {a.id !== currentUserId && (
                  <button
                    onClick={() => toggleLead(a)}
                    className="text-xs font-semibold text-navy hover:underline"
                  >
                    {a.isSuperAdmin ? "Make regular admin" : "Make lead admin"}
                  </button>
                )}
                <button
                  onClick={() => resetPassword(a)}
                  className="text-xs font-semibold text-ink/60 hover:text-ink"
                >
                  Reset password
                </button>
                {a.id !== currentUserId && (
                  <button
                    onClick={() => remove(a)}
                    className="text-xs font-semibold text-red hover:text-red-dark"
                  >
                    Remove admin
                  </button>
                )}
              </div>
            </div>

            {removing === a.id && (
              <div className="mt-3 rounded-sm border border-steel/30 bg-cream p-3">
                <p className="text-xs text-ink/70">
                  {a.name} owns {a.ownedTournaments} tournament
                  {a.ownedTournaments === 1 ? "" : "s"}. Reassign them to:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                    className="rounded-sm border border-steel/40 px-2 py-1 text-xs"
                  >
                    <option value="">Choose an admin…</option>
                    {otherAdmins.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.email})
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!reassignTo}
                    onClick={() => remove(a, reassignTo)}
                    className="rounded-sm bg-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Reassign &amp; remove
                  </button>
                  <button
                    onClick={() => {
                      setRemoving(null);
                      setReassignTo("");
                    }}
                    className="text-xs text-ink/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="rounded-sm border border-steel/20 bg-white p-4">
        <p className="text-sm font-semibold">Create a new admin</p>
        <p className="mt-1 text-xs text-ink/50">
          Makes a fresh account with a one-time password you hand to them.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            placeholder="Full name"
            required
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-ink/70">
          <input type="checkbox" checked={cLead} onChange={(e) => setCLead(e.target.checked)} />
          Make this a lead admin (full site access)
        </label>
        <button
          type="submit"
          disabled={cBusy}
          className="mt-3 rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
        >
          {cBusy ? "Creating…" : "Create admin"}
        </button>
      </form>

      <form onSubmit={handlePromote} className="rounded-sm border border-steel/20 bg-white p-4">
        <p className="text-sm font-semibold">Promote an existing account</p>
        <p className="mt-1 text-xs text-ink/50">
          If the person already has a coach/parent account, make it an admin by email.
        </p>
        <div className="mt-3 flex gap-3">
          <input
            type="email"
            value={pEmail}
            onChange={(e) => setPEmail(e.target.value)}
            placeholder="Email of an existing account"
            required
            className="flex-1 rounded-sm border border-steel/40 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pBusy}
            className="rounded-sm bg-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pBusy ? "…" : "Promote"}
          </button>
        </div>
      </form>
    </div>
  );
}
