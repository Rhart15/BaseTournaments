import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JoinTeamForm from "./JoinTeamForm";

export const dynamic = "force-dynamic";

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) notFound();

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Parent registration
          </p>
          <h1 className="display text-4xl">Join {team.name}</h1>
          <p className="mt-2 text-white/70">
            Enter your athlete&apos;s information below to add them to the{" "}
            {team.ageGroup} roster.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-6 py-12">
        <JoinTeamForm teamId={team.id} />
      </section>
      <SiteFooter />
    </>
  );
}
