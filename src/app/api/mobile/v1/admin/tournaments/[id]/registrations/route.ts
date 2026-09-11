import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileAdminSession } from "@/lib/mobileAuth";
import { guardTournament } from "@/lib/adminAuth";
import { chargedCentsFor } from "@/lib/refunds";

export const dynamic = "force-dynamic";

// Admin registrations + payment status for a tournament -- the mobile
// equivalent of /admin/tournaments/[id]/registrations. Read-only here;
// refunds stay a web-only action for v1.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mobileSession = await getMobileAdminSession(req);
  const g = await guardTournament(id, mobileSession);
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      entryFeeCents: true,
      registrations: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          teamName: true,
          coachName: true,
          coachEmail: true,
          status: true,
          isVipComp: true,
          discountAmountCents: true,
          refundedAmountCents: true,
          rosterApprovalStatus: true,
          division: { select: { label: true } },
          installments: { select: { status: true, amountCents: true } },
          refunds: { select: { id: true } },
        },
      },
    },
  });

  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  const registrations = tournament.registrations.map((r) => {
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
      rosterApprovalStatus: r.rosterApprovalStatus,
      isPlan: r.installments.length > 0,
      isComp: r.isVipComp || charged === 0,
      chargedCents: charged,
      refundedCents: r.refundedAmountCents,
      refundCount: r.refunds.length,
    };
  });

  return NextResponse.json({ tournamentName: tournament.name, registrations });
}
