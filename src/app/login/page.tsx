"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect email or password.");
      setSubmitting(false);
      return;
    }

    router.push(searchParams.get("next") ?? "/account");
    router.refresh();
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <h1 className="display text-3xl">Log in</h1>
        <p className="mt-1 text-sm text-ink/60">
          Access your team or family account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-sm border border-steel/40 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:bg-red-dark disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-red hover:text-red-dark">
            Sign up
          </Link>
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
