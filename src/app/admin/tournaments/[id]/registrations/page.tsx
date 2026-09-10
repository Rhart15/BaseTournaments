import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAdminSession, canManageTournament } from "@/lib/adminAuth";
import { chargedCentsFor } from "@/lib/refunds";
import RegistrationsClient from "./RegistrationsClient";

export const dynamic = "force-dynamic";

export default async function TournamentRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getAdminSession();
  if (!session) redirect(`/login?next=/admin/tournaments/${id}/registrations`);
  if (!(await canManageTournament(id, session))) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          division: { select: { label: true } },
          installments: { select: { status: true, amountCents: true } },
          refunds: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!tournament) notFound();

  const rows = tournament.registrations.map((r) => {
    const charged = chargedCentsFor({
      isVipComp: r.isVipComp,
      discountAmountCents: r.discountAmountCents,
      tournament: { entryFeeCents: tournament.entryFeeCents },
      installments: r.installments,
    });
    return {
      id: r.id,
      teamName: r.teamName,
      division: r.division.label,
      coachName: r.coachName,
      coachEmail: r.coachEmail,
      status: r.status,
      isPlan: r.installments.length > 0,
      isComp: r.isVipComp || charged === 0,
      chargedCents: charged,
      refundedCents: r.refundedAmountCents,
      refundCount: r.refunds.length,
    };
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link
          href={`/admin/tournaments/${id}`}
          className="text-sm text-white/60 hover:text-white"
        >
          Back to {tournament.name}
        </Link>
        <h1 className="display mt-1 text-2xl">Registrations &amp; refunds</h1>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <RegistrationsClient rows={rows} />
      </div>
    </div>
  );
}
