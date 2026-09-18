import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession, isLeadAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import EventDetailsForm from "../EventDetailsForm";

export const dynamic = "force-dynamic";

export default async function NewTournamentPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login?next=/admin/tournaments/new");
  const lead = isLeadAdmin(session);

  const admins = lead
    ? await prisma.user.findMany({
        where: { role: "ADMIN" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to all tournaments
        </Link>
        <h1 className="display mt-1 text-2xl">New tournament</h1>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <EventDetailsForm
          mode="create"
          isLead={lead}
          admins={admins}
          currentUserId={session.user.id}
          initial={{
            name: "",
            season: "",
            sport: "SOFTBALL",
            eventType: "TOURNAMENT",
            entryType: "TEAM",
            status: "DRAFT",
            featured: false,
            startDate: "",
            endDate: "",
            dailyStartTime: "",
            dailyEndTime: "",
            registrationOpensAt: "",
            registrationClosesAt: "",
            registrationStatus: "OPEN",
            city: "",
            state: "AR",
            address: "",
            displayLocation: "",
            slug: "",
            entryFeeDollars: 0,
            teamCap: 24,
            description: "",
            staffTags: "",
            showFlyerInsteadOfLogo: false,
          }}
        />
      </div>
    </div>
  );
}
