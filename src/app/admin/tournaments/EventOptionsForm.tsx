"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EventOptionsInitial = {
  guestPlayerLimit: number | null;
  guestPlayerLimitHigherLevel: number | null;
  freezeRoster: boolean;
  acceptRostersAfterStart: boolean;
  rosterDeadlineAt: string; // yyyy-mm-dd or ""

  disableCheckPayLater: boolean;
  disableECheck: boolean;
  disableCreditCard: boolean;
  disableProcessingFee: boolean;
  addToCartText: string;
  depositType: string; // "" | "PERCENT" | "FLAT"
  depositAmount: number | null;
  salesTaxOverridePercent: number | null;
  eventPasswordSet: boolean;
  showEventForms: boolean;

  showTeamsAttending: boolean;
  showWaitlistedTeams: boolean;
  showTeamAssignedInPlayerDashboard: boolean;
  showTeamsAttendingRosters: boolean;
  showFinalResults: boolean;
  disableRosterNotifications: boolean;
  hideTeamsAttendingLocation: boolean;
  hideVenues: boolean;
  hideRules: boolean;
  showRosterOnTeamSchedule: boolean;
  showRosterCountOnTeamsAttending: boolean;
  teamsAttendingDescription: string;

  gameGuaranteeText: string;
  awardsText: string;
  batType: string;
  fieldType: string;
  genderLabel: string;
  divisionLabelOverride: string;
  costLabelOverride: string;
  specialPriceLabelOverride: string;
  stayToPlay: boolean;

  productsEnabled: boolean;
  productsSalesTaxPercent: number | null;
  ticketsEnabled: boolean;
  ticketsSalesTaxPercent: number | null;
  ticketsExternalLinkEnabled: boolean;
  ticketsExternalUrl: string;
  ticketsButtonBgColor: string;
  ticketsButtonTextColor: string;

  scheduleRequestEnabledAtCheckout: boolean;
  scheduleRequestEnabledInDashboard: boolean;
  scheduleRequestMaxPerTeam: number | null;
  scheduleRequestInstructions: string;
};

const inputCls = "mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm";
const labelCls = "text-sm font-medium";
const sectionHeaderCls = "text-sm font-semibold uppercase tracking-wide text-ink/60";
const checkboxRow = "flex items-center gap-2 text-sm";

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className={checkboxRow}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function PasswordWidget({ tournamentId, initiallySet }: { tournamentId: string; initiallySet: boolean }) {
  const router = useRouter();
  const [isSet, setIsSet] = useState(initiallySet);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(eventPassword: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Couldn't update.");
      return;
    }
    setIsSet(Boolean(eventPassword));
    setValue("");
    setMsg(eventPassword ? "Password set." : "Password protection removed.");
    router.refresh();
  }

  return (
    <div>
      <label className={labelCls}>Event password protection (lead admins only)</label>
      <p className="mt-1 text-xs text-ink/50">
        {isSet ? "A password is currently set." : "No password set — registration is open to anyone."}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isSet ? "Set a new password" : "Set a password"}
          className="max-w-xs rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !value}
          onClick={() => save(value)}
          className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSet ? "Update password" : "Set password"}
        </button>
        {isSet && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save("")}
            className="text-sm font-semibold text-red hover:text-red-dark disabled:opacity-50"
          >
            Remove protection
          </button>
        )}
      </div>
      {msg && <p className="mt-1 text-xs text-ink/60">{msg}</p>}
    </div>
  );
}

export default function EventOptionsForm({
  tournamentId,
  isLead,
  initial,
}: {
  tournamentId: string;
  isLead: boolean;
  initial: EventOptionsInitial;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const checkbox = (name: string) => form.get(name) === "on";
    const text = (name: string) => form.get(name);
    const num = (name: string) => form.get(name);

    const payload = {
      guestPlayerLimit: num("guestPlayerLimit"),
      guestPlayerLimitHigherLevel: num("guestPlayerLimitHigherLevel"),
      freezeRoster: checkbox("freezeRoster"),
      acceptRostersAfterStart: checkbox("acceptRostersAfterStart"),
      rosterDeadlineAt: text("rosterDeadlineAt") || null,

      disableCheckPayLater: checkbox("disableCheckPayLater"),
      disableECheck: checkbox("disableECheck"),
      disableCreditCard: checkbox("disableCreditCard"),
      disableProcessingFee: checkbox("disableProcessingFee"),
      addToCartText: text("addToCartText"),
      depositType: text("depositType") || null,
      depositAmount: num("depositAmount"),
      showEventForms: checkbox("showEventForms"),
      ...(isLead ? { salesTaxOverridePercent: num("salesTaxOverridePercent") } : {}),

      showTeamsAttending: checkbox("showTeamsAttending"),
      showWaitlistedTeams: checkbox("showWaitlistedTeams"),
      showTeamAssignedInPlayerDashboard: checkbox("showTeamAssignedInPlayerDashboard"),
      showTeamsAttendingRosters: checkbox("showTeamsAttendingRosters"),
      showFinalResults: checkbox("showFinalResults"),
      disableRosterNotifications: checkbox("disableRosterNotifications"),
      hideTeamsAttendingLocation: checkbox("hideTeamsAttendingLocation"),
      hideVenues: checkbox("hideVenues"),
      hideRules: checkbox("hideRules"),
      showRosterOnTeamSchedule: checkbox("showRosterOnTeamSchedule"),
      showRosterCountOnTeamsAttending: checkbox("showRosterCountOnTeamsAttending"),
      teamsAttendingDescription: text("teamsAttendingDescription"),

      gameGuaranteeText: text("gameGuaranteeText"),
      awardsText: text("awardsText"),
      batType: text("batType"),
      fieldType: text("fieldType"),
      genderLabel: text("genderLabel"),
      divisionLabelOverride: text("divisionLabelOverride"),
      costLabelOverride: text("costLabelOverride"),
      specialPriceLabelOverride: text("specialPriceLabelOverride"),
      stayToPlay: checkbox("stayToPlay"),

      productsEnabled: checkbox("productsEnabled"),
      productsSalesTaxPercent: num("productsSalesTaxPercent"),
      ticketsEnabled: checkbox("ticketsEnabled"),
      ticketsSalesTaxPercent: num("ticketsSalesTaxPercent"),
      ticketsExternalLinkEnabled: checkbox("ticketsExternalLinkEnabled"),
      ticketsExternalUrl: text("ticketsExternalUrl"),
      ticketsButtonBgColor: text("ticketsButtonBgColor"),
      ticketsButtonTextColor: text("ticketsButtonTextColor"),

      scheduleRequestEnabledAtCheckout: checkbox("scheduleRequestEnabledAtCheckout"),
      scheduleRequestEnabledInDashboard: checkbox("scheduleRequestEnabledInDashboard"),
      scheduleRequestMaxPerTeam: num("scheduleRequestMaxPerTeam"),
      scheduleRequestInstructions: text("scheduleRequestInstructions"),
    };

    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isLead && (
        <div className="rounded-sm border border-steel/20 bg-white p-6">
          <PasswordWidget tournamentId={tournamentId} initiallySet={initial.eventPasswordSet} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 rounded-sm border border-steel/20 bg-white p-6">
        <section className="space-y-3">
          <h3 className={sectionHeaderCls}>Roster rules</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Max guest players</label>
              <input type="number" min="0" name="guestPlayerLimit" defaultValue={initial.guestPlayerLimit ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max higher-level guest players</label>
              <input
                type="number"
                min="0"
                name="guestPlayerLimitHigherLevel"
                defaultValue={initial.guestPlayerLimitHigherLevel ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Roster submission deadline</label>
              <input type="date" name="rosterDeadlineAt" defaultValue={initial.rosterDeadlineAt} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Toggle name="freezeRoster" label="Freeze roster submission" defaultChecked={initial.freezeRoster} />
            <Toggle
              name="acceptRostersAfterStart"
              label="Accept rosters after event starts"
              defaultChecked={initial.acceptRostersAfterStart}
            />
          </div>
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Checkout / payments</h3>
          <div className="flex flex-wrap gap-4">
            <Toggle name="disableCheckPayLater" label="Disable check/pay-later" defaultChecked={initial.disableCheckPayLater} />
            <Toggle name="disableECheck" label="Disable eCheck" defaultChecked={initial.disableECheck} />
            <Toggle name="disableCreditCard" label="Disable credit card" defaultChecked={initial.disableCreditCard} />
            <Toggle name="disableProcessingFee" label="Disable processing fee" defaultChecked={initial.disableProcessingFee} />
            <Toggle name="showEventForms" label="Show event forms" defaultChecked={initial.showEventForms} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Add-to-cart button text</label>
              <input name="addToCartText" defaultValue={initial.addToCartText} placeholder="Add to Cart" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deposit type</label>
              <select name="depositType" defaultValue={initial.depositType} className={inputCls}>
                <option value="">None</option>
                <option value="PERCENT">Percentage</option>
                <option value="FLAT">Flat amount</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Deposit amount</label>
              <input type="number" min="0" name="depositAmount" defaultValue={initial.depositAmount ?? ""} className={inputCls} />
              <p className="mt-1 text-xs text-ink/50">Percentage: whole number (25 = 25%). Flat: cents (5000 = $50.00).</p>
            </div>
            {isLead && (
              <div>
                <label className={labelCls}>Sales tax override % (lead admins only)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="salesTaxOverridePercent"
                  defaultValue={initial.salesTaxOverridePercent ?? ""}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-ink/50">
                  Not yet applied at checkout — no platform sales-tax settings exist yet.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Display / teams &amp; players</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Toggle name="showTeamsAttending" label="Show teams attending" defaultChecked={initial.showTeamsAttending} />
            <Toggle name="showWaitlistedTeams" label="Show waitlisted teams" defaultChecked={initial.showWaitlistedTeams} />
            <Toggle
              name="showTeamAssignedInPlayerDashboard"
              label="Show team assigned in player dashboard"
              defaultChecked={initial.showTeamAssignedInPlayerDashboard}
            />
            <Toggle
              name="showTeamsAttendingRosters"
              label="Show teams attending rosters"
              defaultChecked={initial.showTeamsAttendingRosters}
            />
            <Toggle name="showFinalResults" label="Show final results" defaultChecked={initial.showFinalResults} />
            <Toggle
              name="disableRosterNotifications"
              label="Disable roster notifications"
              defaultChecked={initial.disableRosterNotifications}
            />
            <Toggle
              name="hideTeamsAttendingLocation"
              label="Hide teams attending location"
              defaultChecked={initial.hideTeamsAttendingLocation}
            />
            <Toggle name="hideVenues" label="Hide venues" defaultChecked={initial.hideVenues} />
            <Toggle name="hideRules" label="Hide rules" defaultChecked={initial.hideRules} />
            <Toggle
              name="showRosterOnTeamSchedule"
              label="Show roster on team schedule"
              defaultChecked={initial.showRosterOnTeamSchedule}
            />
            <Toggle
              name="showRosterCountOnTeamsAttending"
              label="Show roster count on teams attending"
              defaultChecked={initial.showRosterCountOnTeamsAttending}
            />
          </div>
          <div>
            <label className={labelCls}>Teams attending page description</label>
            <textarea
              name="teamsAttendingDescription"
              rows={3}
              defaultValue={initial.teamsAttendingDescription}
              className={inputCls}
            />
          </div>
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Bullet points &amp; labels</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Game/sets guarantee</label>
              <input name="gameGuaranteeText" placeholder="3gg" defaultValue={initial.gameGuaranteeText} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Awards</label>
              <input name="awardsText" placeholder="1-3" defaultValue={initial.awardsText} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bat type</label>
              <input name="batType" defaultValue={initial.batType} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Field/court type</label>
              <input name="fieldType" defaultValue={initial.fieldType} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select name="genderLabel" defaultValue={initial.genderLabel} className={inputCls}>
                <option value="">Open</option>
                <option value="COED">Coed</option>
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Division label override</label>
              <input name="divisionLabelOverride" defaultValue={initial.divisionLabelOverride} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cost label override</label>
              <input name="costLabelOverride" defaultValue={initial.costLabelOverride} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Special price label override</label>
              <input
                name="specialPriceLabelOverride"
                defaultValue={initial.specialPriceLabelOverride}
                className={inputCls}
              />
            </div>
          </div>
          <Toggle name="stayToPlay" label="Stay-to-play" defaultChecked={initial.stayToPlay} />
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Products &amp; tickets</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-end pb-1.5">
              <Toggle name="productsEnabled" label="Products enabled" defaultChecked={initial.productsEnabled} />
            </div>
            <div>
              <label className={labelCls}>Products sales tax %</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="productsSalesTaxPercent"
                defaultValue={initial.productsSalesTaxPercent ?? ""}
                className={inputCls}
              />
            </div>
            <div className="flex items-end pb-1.5">
              <Toggle name="ticketsEnabled" label="Tickets enabled" defaultChecked={initial.ticketsEnabled} />
            </div>
            <div>
              <label className={labelCls}>Tickets sales tax %</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="ticketsSalesTaxPercent"
                defaultValue={initial.ticketsSalesTaxPercent ?? ""}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-end pb-1.5">
              <Toggle
                name="ticketsExternalLinkEnabled"
                label="External ticket link"
                defaultChecked={initial.ticketsExternalLinkEnabled}
              />
            </div>
            <div>
              <label className={labelCls}>Tickets URL</label>
              <input name="ticketsExternalUrl" defaultValue={initial.ticketsExternalUrl} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Button background color</label>
              <input type="color" name="ticketsButtonBgColor" defaultValue={initial.ticketsButtonBgColor || "#c1272d"} className="mt-1 h-9 w-full rounded-sm border border-steel/40" />
            </div>
            <div>
              <label className={labelCls}>Button text color</label>
              <input type="color" name="ticketsButtonTextColor" defaultValue={initial.ticketsButtonTextColor || "#ffffff"} className="mt-1 h-9 w-full rounded-sm border border-steel/40" />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Schedule requests</h3>
          <div className="flex flex-wrap gap-4">
            <Toggle
              name="scheduleRequestEnabledAtCheckout"
              label="Display at checkout"
              defaultChecked={initial.scheduleRequestEnabledAtCheckout}
            />
            <Toggle
              name="scheduleRequestEnabledInDashboard"
              label="Display in customer dashboard"
              defaultChecked={initial.scheduleRequestEnabledInDashboard}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Requests allowed per team</label>
              <input
                type="number"
                min="0"
                name="scheduleRequestMaxPerTeam"
                defaultValue={initial.scheduleRequestMaxPerTeam ?? ""}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Custom instructions</label>
            <textarea
              name="scheduleRequestInstructions"
              rows={3}
              defaultValue={initial.scheduleRequestInstructions}
              className={inputCls}
            />
          </div>
        </section>

        {error && <p className="text-sm text-red">{error}</p>}
        {saved && !error && <p className="text-sm text-green-700">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
