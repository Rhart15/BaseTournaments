"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm({
  tournamentId,
  divisions,
}: {
  tournamentId: string;
  divisions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "vip">("card");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      tournamentId,
      divisionId: formData.get("divisionId"),
      teamName: formData.get("teamName"),
      coachName: formData.get("coachName"),
      coachEmail: formData.get("coachEmail"),
      coachPhone: formData.get("coachPhone"),
      ...(paymentMethod === "vip" && { vipCode: formData.get("vipCode") }),
    };

    try {
      const res = await fetch(
        paymentMethod === "vip" ? "/api/checkout/vip" : "/api/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      if (paymentMethod === "vip") {
        router.push(`/register/success?registration=${data.registrationId}`);
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Division</label>
        <select
          name="divisionId"
          required
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Team name</label>
        <input
          name="teamName"
          required
          minLength={2}
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Coach name</label>
        <input
          name="coachName"
          required
          minLength={2}
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Coach email</label>
        <input
          name="coachEmail"
          type="email"
          required
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Coach phone</label>
        <input
          name="coachPhone"
          type="tel"
          required
          className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Payment method</label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`flex-1 rounded-sm border px-3 py-2 text-sm font-semibold ${
              paymentMethod === "card"
                ? "border-red bg-red/5 text-red"
                : "border-steel/40 text-ink/60 hover:border-red hover:text-red"
            }`}
          >
            Card
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("vip")}
            className={`flex-1 rounded-sm border px-3 py-2 text-sm font-semibold ${
              paymentMethod === "vip"
                ? "border-gold bg-gold/10 text-ink"
                : "border-steel/40 text-ink/60 hover:border-gold"
            }`}
          >
            VIP
          </button>
        </div>
      </div>

      {paymentMethod === "vip" && (
        <div>
          <label className="text-sm font-medium">VIP access code</label>
          <input
            name="vipCode"
            required
            className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            placeholder="Enter the code you were given"
          />
        </div>
      )}

      {error && <p className="text-sm text-red">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
      >
        {submitting
          ? paymentMethod === "vip"
            ? "Confirming..."
            : "Redirecting to payment…"
          : paymentMethod === "vip"
          ? "Confirm VIP registration"
          : "Register & pay"}
      </button>
      <p className="text-center text-xs text-ink/50">
        {paymentMethod === "vip"
          ? "VIP registrations are confirmed instantly, no charge."
          : "Secure checkout powered by Stripe."}
      </p>
    </form>
  );
}
