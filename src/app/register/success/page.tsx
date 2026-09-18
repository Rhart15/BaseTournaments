import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ registration?: string; order?: string }>;
}) {
  const { registration: registrationId, order: orderGroupId } = await searchParams;

  const registration = registrationId
    ? await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { tournament: true },
      })
    : null;

  const orderRegistrations = orderGroupId
    ? await prisma.registration.findMany({
        where: { orderGroupId },
        include: { tournament: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="display text-4xl">
          {orderRegistrations.length > 0
            ? orderRegistrations.every((r) => r.status === "WAITLISTED")
              ? "You're on the waitlist!"
              : "You're registered!"
            : registration?.status === "WAITLISTED"
              ? "You're on the waitlist!"
              : "You're registered!"}
        </h1>

        {orderRegistrations.length > 0 ? (
          <div className="mt-6 space-y-3 text-left">
            {orderRegistrations.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-sm border border-steel/20 p-4"
              >
                <div>
                  <p className="font-semibold">{r.teamName}</p>
                  <p className="text-sm text-ink/60">{r.tournament.name}</p>
                  {r.status === "WAITLISTED" && (
                    <p className="mt-1 inline-block rounded-sm bg-gold/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink/70">
                      Waitlisted
                    </p>
                  )}
                </div>
                <Link
                  href={`/registrations/${r.id}`}
                  className="text-sm font-semibold text-red hover:text-red-dark"
                >
                  Manage roster
                </Link>
              </div>
            ))}
          </div>
        ) : registration ? (
          registration.status === "WAITLISTED" ? (
            <p className="mt-4 text-ink/70">
              {registration.teamName}&apos;s division for {registration.tournament.name} is
              full. You&apos;re on the waitlist and will be contacted if a spot opens up. A
              confirmation has been sent to {registration.coachEmail}.
            </p>
          ) : (
            <p className="mt-4 text-ink/70">
              {registration.teamName} is confirmed for{" "}
              {registration.tournament.name}. A confirmation has been sent to{" "}
              {registration.coachEmail}.
            </p>
          )
        ) : (
          <p className="mt-4 text-ink/70">
            Your registration is being confirmed. You&apos;ll receive an
            email shortly.
          </p>
        )}
        {registration?.isVipComp && (
          <p className="mt-3 inline-block rounded-sm bg-gold/20 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-ink/70">
            {registration.status === "WAITLISTED" ? "VIP — waitlisted" : "Paid with VIP"}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {registration && (
            <Link
              href={`/registrations/${registration.id}`}
              className="rounded-sm bg-red px-6 py-3 font-semibold text-white hover:bg-red-dark"
            >
              Manage your team roster
            </Link>
          )}
          <Link
            href="/tournaments"
            className="rounded-sm border border-steel/40 px-6 py-3 font-semibold text-ink hover:border-red"
          >
            Browse more tournaments
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}