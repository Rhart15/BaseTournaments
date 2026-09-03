import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import AdminsClient from "./AdminsClient";

export const dynamic = "force-dynamic";

export default async function ManageAdminsPage() {
  const session = await auth();
  if (!session || !session.user.isSuperAdmin) {
    redirect("/admin");
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">Manage admins</h1>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <AdminsClient
          admins={admins.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            isSuperAdmin: a.isSuperAdmin,
          }))}
        />
      </div>
    </div>
  );
}
