"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildEventSlugBase } from "@/lib/eventSlug";

type AdminOpt = { id: string; name: string; email: string };

export type EventDetailsInitial = {
  name: string;
  season: string;
  sport: string;
  eventType: string;
  entryType: string;
  status: string;
  featured: boolean;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  dailyStartTime: string; // "HH:mm"
  dailyEndTime: string;
  registrationOpensAt: string; // yyyy-MM-ddTHH:mm, or ""
  registrationClosesAt: string;
  registrationStatus: string;
  city: string;
  state: string;
  address: string;
  displayLocation: string;
  slug: string;
  entryFeeDollars: number;
  teamCap: number;
  description: string;
  staffTags: string; // comma separated for the input
  showFlyerInsteadOfLogo: boolean;
};

const inputCls =
  "mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm";
const labelCls = "text-sm font-medium";
const sectionHeaderCls =
  "text-sm font-semibold uppercase tracking-wide text-ink/60";

export default function EventDetailsForm({
  mode,
  tournamentId,
  isLead,
  admins,
  currentUserId,
  currentOwnerId,
  initial,
}: {
  mode: "create" | "edit";
  tournamentId?: string;
  isLead: boolean;
  admins: AdminOpt[];
  currentUserId: string;
  currentOwnerId?: string | null;
  initial: EventDetailsInitial;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  function handleNameOrLocationChange(name: string, city: string, startDate: string) {
    if (slugTouched) return;
    if (!name) return;
    setSlug(buildEventSlugBase({ name, city, startDate: startDate ? new Date(startDate) : new Date() }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      season: form.get("season"),
      sport: form.get("sport"),
      eventType: form.get("eventType"),
      entryType: form.get("entryType"),
      status: form.get("status"),
      featured: form.get("featured") === "on",
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      dailyStartTime: form.get("dailyStartTime"),
      dailyEndTime: form.get("dailyEndTime"),
      registrationOpensAt: form.get("registrationOpensAt") || null,
      registrationClosesAt: form.get("registrationClosesAt") || null,
      registrationStatus: form.get("registrationStatus"),
      city: form.get("city"),
      state: form.get("state"),
      address: form.get("address"),
      displayLocation: form.get("displayLocation"),
      slug,
      entryFeeDollars: form.get("entryFeeDollars"),
      teamCap: form.get("teamCap"),
      description: form.get("description"),
      staffTags: form.get("staffTags"),
      showFlyerInsteadOfLogo: form.get("showFlyerInsteadOfLogo") === "on",
      ...(isLead && form.get("ownerId") ? { ownerId: form.get("ownerId") } : {}),
    };

    const url =
      mode === "create" ? "/api/admin/tournaments" : `/api/admin/tournaments/${tournamentId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    if (mode === "create") {
      const data = await res.json();
      router.push(`/admin/tournaments/${data.tournament.id}`);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h3 className={sectionHeaderCls}>Basics</h3>
        <div>
          <label className={labelCls}>Event name</label>
          <input
            name="name"
            required
            defaultValue={initial.name}
            onChange={(e) =>
              handleNameOrLocationChange(
                e.target.value,
                (e.currentTarget.form?.elements.namedItem("city") as HTMLInputElement)?.value ?? "",
                (e.currentTarget.form?.elements.namedItem("startDate") as HTMLInputElement)?.value ?? ""
              )
            }
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Sport</label>
            <select name="sport" required defaultValue={initial.sport} className={inputCls}>
              <option value="SOFTBALL">Softball</option>
              <option value="BASEBALL">Baseball</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Season</label>
            <input
              name="season"
              placeholder="Fall 2026"
              defaultValue={initial.season}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Event type</label>
            <select name="eventType" defaultValue={initial.eventType} className={inputCls}>
              <option value="TOURNAMENT">Tournament</option>
              <option value="LEAGUE">League</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Registration type</label>
            <select name="entryType" defaultValue={initial.entryType} className={inputCls}>
              <option value="TEAM">Team</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Status</label>
            <select name="status" defaultValue={initial.status} className={inputCls}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="featured" defaultChecked={initial.featured} />
              Featured event
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-steel/20 pt-6">
        <h3 className={sectionHeaderCls}>Dates &amp; times</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Start date</label>
            <input
              name="startDate"
              type="date"
              required
              defaultValue={initial.startDate}
              onChange={(e) =>
                handleNameOrLocationChange(
                  (e.currentTarget.form?.elements.namedItem("name") as HTMLInputElement)?.value ?? "",
                  (e.currentTarget.form?.elements.namedItem("city") as HTMLInputElement)?.value ?? "",
                  e.target.value
                )
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End date</label>
            <input name="endDate" type="date" required defaultValue={initial.endDate} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Daily start time</label>
            <input name="dailyStartTime" type="time" defaultValue={initial.dailyStartTime} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Daily end time</label>
            <input name="dailyEndTime" type="time" defaultValue={initial.dailyEndTime} className={inputCls} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-steel/20 pt-6">
        <h3 className={sectionHeaderCls}>Registration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Registration opens</label>
            <input
              name="registrationOpensAt"
              type="datetime-local"
              defaultValue={initial.registrationOpensAt}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Registration closes</label>
            <input
              name="registrationClosesAt"
              type="datetime-local"
              defaultValue={initial.registrationClosesAt}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Registration status</label>
            <select name="registrationStatus" defaultValue={initial.registrationStatus} className={inputCls}>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="WAITLIST">Waitlist</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Team cap</label>
            <input
              name="teamCap"
              type="number"
              min="1"
              required
              defaultValue={initial.teamCap}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Base entry fee (dollars)</label>
          <input
            name="entryFeeDollars"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={initial.entryFeeDollars}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-ink/50">
            Default fee for all divisions; each division can override this.
          </p>
        </div>
      </section>

      <section className="space-y-4 border-t border-steel/20 pt-6">
        <h3 className={sectionHeaderCls}>Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>City</label>
            <input
              name="city"
              required
              defaultValue={initial.city}
              onChange={(e) =>
                handleNameOrLocationChange(
                  (e.currentTarget.form?.elements.namedItem("name") as HTMLInputElement)?.value ?? "",
                  e.target.value,
                  (e.currentTarget.form?.elements.namedItem("startDate") as HTMLInputElement)?.value ?? ""
                )
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input name="state" defaultValue={initial.state} maxLength={2} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Street address</label>
          <input name="address" defaultValue={initial.address} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Display location (public override)</label>
          <input
            name="displayLocation"
            placeholder="e.g. Downtown Sports Complex"
            defaultValue={initial.displayLocation}
            className={inputCls}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-steel/20 pt-6">
        <h3 className={sectionHeaderCls}>URL &amp; listing</h3>
        <div>
          <label className={labelCls}>URL slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-ink/50">
            Auto-generated from name, location, and year until you edit it directly.
          </p>
        </div>
        <div>
          <label className={labelCls}>Staff tags (comma separated)</label>
          <input name="staffTags" placeholder="Shannon, Ashley" defaultValue={initial.staffTags} className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="showFlyerInsteadOfLogo"
            defaultChecked={initial.showFlyerInsteadOfLogo}
          />
          Show flyer image instead of logo on public listing
        </label>
      </section>

      <section className="space-y-4 border-t border-steel/20 pt-6">
        <h3 className={sectionHeaderCls}>Content</h3>
        <div>
          <label className={labelCls}>Description / rules</label>
          <textarea name="description" rows={4} defaultValue={initial.description} className={inputCls} />
        </div>
      </section>

      {isLead && mode === "create" && (
        <section className="space-y-4 border-t border-steel/20 pt-6">
          <h3 className={sectionHeaderCls}>Payments</h3>
          <div>
            <label className={labelCls}>Merchant / payment account</label>
            <select
              name="ownerId"
              defaultValue={currentOwnerId ?? currentUserId}
              className={inputCls}
            >
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.email}){a.id === currentUserId ? " — you" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink/50">
              Registration fees are paid into this admin&apos;s connected Stripe account.
            </p>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red">{error}</p>}
      {saved && !error && <p className="text-sm text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
      >
        {saving ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
      </button>
    </form>
  );
}
