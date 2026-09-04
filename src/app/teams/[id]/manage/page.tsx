import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
        finalPlacement: r.finalPlacement,
        wins: r.poolWins + r.bracketWins,
        losses: r.poolLosses + r.bracketLosses,
      }))}
      pastEvents={past.map((r) => ({
        id: r.id,
        tournamentName: r.tournament.name,
        division: r.division.label,
        startDate: r.tournament.startDate.toISOString(),
        endDate: r.tournament.endDate.toISOString(),
        status: r.status,
        finalPlacement: r.finalPlacement,
        wins: r.poolWins + r.bracketWins,
        losses: r.poolLosses + r.bracketLosses,
      }))}
    />
  );
}
