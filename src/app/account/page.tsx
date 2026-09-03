import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CoachTeamsPanel from "./CoachTeamsPanel";
import ParentFamilyPanel from "./ParentFamilyPanel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/account");

  const isCoach = session.user.role === "COACH";

  const teams = isCoach
    ? await prisma.team.findMany({
        where: { coachUserId: session.user.id },
        orderBy: { name: "asc" },
      })
    : [];

  const athletes = !isCoach
    ? await prisma.familyAthlete.findMany({
        where: { parentId: session.user.id },
        orderBy: { lastName: "asc" },
      })
    : [];

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Account dashboard
          </p>
          <h1 className="display text-4xl">
            Welcome, {session.user.name?.split(" ")[0]}
          </h1>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mt-4 text-sm text-white/60 underline hover:text-white"
            >
              Log out
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        {isCoach ? (
          <CoachTeamsPanel
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              ageGroup: t.ageGroup,
              homeCity: t.homeCity,
              homeState: t.homeState,
            }))}
          />
        ) : (
          <ParentFamilyPanel
            athletes={athletes.map((a) => ({
              id: a.id,
              firstName: a.firstName,
              lastName: a.lastName,
              birthYear: a.birthYear,
            }))}
          />
        )}
      </section>
      <SiteFooter />
    </>
  );
}
