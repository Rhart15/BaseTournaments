import { notFound } from "next/navigation";
import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import DivisionTabs from "./DivisionTabs";

export const dynamic = "force-dynamic";

export default async function DivisionPage({
  params,
}: {
  params: Promise<{ id: string; divisionId: string }>;
}) {
  const { divisionId } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      tournament: true,
      pools: { orderBy: { label: "asc" } },
      registrations: {
        include: { pool: true },
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
      },
      games: {
        include: { homeTeam: true, awayTeam: true, pool: true },
        orderBy: [{ startTime: "asc" }, { round: "asc" }],
      },
    },
  });

  if (!division) notFound();

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-xs uppercase tracking-wide text-red">
            {division.tournament.name}
          </div>
          <h1 className="display text-4xl">{division.label}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <Suspense fallback={<p className="text-ink/60">Loading...</p>}>
          <DivisionTabs
            division={{
              id: division.id,
              label: division.label,
              bracketPublished: division.bracketPublished,
            }}
            pools={division.pools}
            registrations={division.registrations}
            games={division.games}
            isAdmin={isAdmin}
          />
        </Suspense>
      </section>
      <SiteFooter />
    </>
  );
}
