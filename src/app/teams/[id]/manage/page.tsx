import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isAdminAuthed } from "@/lib/adminAuth";
import TeamManageClient from "./TeamManageClient";

export const dynamic = "force-dynamic";

export default async function TeamManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      staff: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      players: { orderBy: { lastName: "asc" } },
      registrations: {
        include: { tournament: true, division: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!team) notFound();

  // Access rule: admins can always manage any team. Otherwise, the
  // logged-in coach must either own this team already, or the team has no
  // owning coach assigned yet (covers teams created before real accounts
  // existed) -- once a coach opens it, later we may want to auto-claim it.
  const adminOk = await isAdminAuthed();
  if (!adminOk) {
    const session = await auth();
    if (!session) {
      redirect(`/login?next=/teams/${id}/manage`);
    }
    if (team.coachUserId && team.coachUserId !== session.user.id) {
      redirect("/account");
    }
  }

  const now = new Date();
  const upcoming = team.registrations.filter(
    (r) => r.tournament.startDate >= now
  );
  const past = team.registrations.filter(
    (r) => r.tournament.startDate < now
  );

  return (
    <TeamManageClient
      team={{
        id: team.id,
        name: team.name,
        organization: team.organization,
        ageGroup: team.ageGroup,
        homeCity: team.homeCity,
        homeState: team.homeState,
        logoUrl: team.logoUrl,
      }}
      staff={team.staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        phone: s.phone,
        email: s.email,
        isHousingContact: s.isHousingContact,
        backgroundCheckStatus: s.backgroundCheckStatus,
        backgroundCheckFileName: s.backgroundCheckFileName,
      }))}
      documents={team.documents.map((d) => ({
        id: d.id,
        label: d.label,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
      }))}
      players={team.players.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        backgroundCheckStatus: p.backgroundCheckStatus,
        backgroundCheckFileName: p.backgroundCheckFileName,
      }))}
      upcomingEvents={upcoming.map((r) => ({
        id: r.id,
        tournamentName: r.tournament.name,
        division: r.division.label,
        startDate: r.tournament.startDate.toISOString(),
        endDate: r.tournament.endDate.toISOString(),
        status: r.status,
      }))}
      pastEvents={past.map((r) => ({
        id: r.id,
        tournamentName: r.tournament.name,
        division: r.division.label,
        startDate: r.tournament.startDate.toISOString(),
        endDate: r.tournament.endDate.toISOString(),
        status: r.status,
      }))}
    />
  );
}
