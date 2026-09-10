import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { refreshConnectStatus } from "@/lib/connect";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/login?next=/admin/settings");

  const { connect } = await searchParams;

  // Coming back from Stripe onboarding -- pull the latest state.
  if (connect === "return" || connect === "refresh") {
    try {
      await refreshConnectStatus(session.user.id);
    } catch {
      /* shown as "not reachable" below */
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      mustChangePassword: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      stripeConnectDetailsSubmitted: true,
      stripeConnectRefreshedAt: true,
    },
  });
  if (!user) redirect("/login");

  const owned = await prisma.tournament.count({ where: { ownerId: session.user.id } });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">Account &amp; payouts</h1>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <SettingsClient
          name={user.name}
          email={user.email}
          ownedTournaments={owned}
          mustChangePassword={user.mustChangePassword}
          connect={{
            started: Boolean(user.stripeConnectAccountId),
            chargesEnabled: user.stripeConnectChargesEnabled,
            payoutsEnabled: user.stripeConnectPayoutsEnabled,
            detailsSubmitted: user.stripeConnectDetailsSubmitted,
            refreshedAt: user.stripeConnectRefreshedAt?.toISOString() ?? null,
          }}
        />
      </div>
    </div>
  );
}
