import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ registration?: string }>;
}) {
  const { registration: registrationId } = await searchParams;
  const registration = registrationId
    ? await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { tournament: true },
      })
    : null;

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="display text-4xl">You&apos;re registered!</h1>
        {registration ? (
          <p className="mt-4 text-ink/70">
            {registration.teamName} is confirmed for{" "}
            {registration.tournament.name}. A confirmation has been sent to{" "}
            {registration.coachEmail}.
          </p>
        ) : (
          <p className="mt-4 text-ink/70">
            Your registration is being confirmed. You&apos;ll receive an
            email shortly.
          </p>
        )}
        <Link
          href="/tournaments"
          className="mt-8 inline-block rounded-sm bg-red px-6 py-3 font-semibold text-white hover:bg-red-dark"
        >
          Browse more tournaments
        </Link>
      </section>
      <SiteFooter />
    </>
  );
}
