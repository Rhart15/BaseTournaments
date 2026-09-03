"use client";

import { useState } from "react";

type Admin = {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
};

export default function AdminsClient({ admins: initialAdmins }: { admins: Admin[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setAdmins((prev) => [
      ...prev,
      {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        isSuperAdmin: data.user.isSuperAdmin,
      },
    ]);
    setEmail("");
    setSubmitting(false);
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } else {
      const data = await res.json();
      setError(data.error ?? "Couldn't remove that admin.");
    }
  }

  return (
    <div>
      <p className="text-sm text-ink/60">
        Admins can edit tournaments, background checks, and all backend
        data. Only the main admin (marked below) can add or remove other
        admins.
      </p>

      <div className="mt-6 space-y-2">
        {admins.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-sm border border-steel/20 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-semibold">{a.name}</span>
              {a.isSuperAdmin && (
                <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink/70">
                  Main admin
                </span>
              )}
              <p className="text-ink/60">{a.email}</p>
            </div>
            {!a.isSuperAdmin && (
              <button
                onClick={() => handleRemove(a.id)}
                className="text-xs font-semibold text-red hover:text-red-dark"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleAdd}
        className="mt-6 flex gap-3 rounded-sm border border-steel/20 bg-white p-4"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email of an existing account"
          required
          className="flex-1 rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
        >
          {submitting ? "Adding..." : "+ Add admin"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
      <p className="mt-2 text-xs text-ink/50">
        The person must already have a regular account (sign up first at{" "}
        /signup), then you can promote them to admin here by email.
      </p>
    </div>
  );
}
