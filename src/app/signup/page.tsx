"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"COACH" | "PARENT">("COACH");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError("Account created, but sign-in failed. Try logging in.");
      setSubmitting(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="display text-3xl">Create your account</h1>
        <p className="mt-1 text-sm text-ink/60">
          Coaches manage teams and rosters. Parents track their athlete's
          registrations.
        </p>

        <div className="mt-6 flex rounded-sm border border-steel/40">
          <button
            type="button"
            onClick={() => setRole("COACH")}
            className={`flex-1 py-2 text-sm font-semibold ${
              role === "COACH" ? "bg-navy text-white" : "text-ink/60"
            }`}
          >
            I&apos;m a Coach
          </button>
          <button
            type="button"
            onClick={() => setRole("PARENT")}
            className={`flex-1 py-2 text-sm font-semibold ${
              role === "PARENT" ? "bg-navy text-white" : "text-ink/60"
            }`}
          >
            I&apos;m a Parent
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-ink/50">At least 8 characters.</p>
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-red hover:text-red-dark">
            Log in
          </Link>
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
