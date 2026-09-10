import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession, isLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import AdminsClient from "./AdminsClient";

export const dynamic = "force-dynamic";

export default async function ManageAdminsPage() {
  const session = await getAdminSession();
  if (!session || !isLeadAdmin(session)) {
    redirect("/admin");
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      mustChangePassword: true,
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
      stripeConnectDetailsSubmitted: true,
      _count: { select: { ownedTournaments: true } },
    },
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">Manage admins</h1>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <AdminsClient
          currentUserId={session.user.id}
          admins={admins.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            isSuperAdmin: a.isSuperAdmin,
            mustChangePassword: a.mustChangePassword,
            connectStarted: Boolean(a.stripeConnectAccountId),
            chargesEnabled: a.stripeConnectChargesEnabled,
            payoutsEnabled: a.stripeConnectPayoutsEnabled,
            detailsSubmitted: a.stripeConnectDetailsSubmitted,
            ownedTournaments: a._count.ownedTournaments,
          }))}
        />
      </div>
    </div>
  );
}
