import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AgeChartPage() {
  const entries = await prisma.ageChartEntry.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const baseball = entries.filter((e) => e.sport === "BASEBALL");
  const softball = entries.filter((e) => e.sport === "SOFTBALL");

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Eligibility
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">Age chart</h1>
          <p className="mt-4 max-w-xl text-white/80">
            Division eligibility is based on birth year, not school grade.
            Find your player&apos;s division below.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        {entries.length === 0 ? (
          <p className="text-sm text-ink/60">
            Age chart data hasn&apos;t been loaded yet. Check back soon, or
            contact your tournament director for eligibility questions.
          </p>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2">
            <AgeChartTable title="Baseball" rows={baseball} />
            <AgeChartTable title="Softball" rows={softball} />
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}

function AgeChartTable({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; division: string; birthYearStart: number; birthYearEnd: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h2 className="display text-xl">{title}</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-steel/30 text-left text-ink/60">
            <th className="pb-2 font-medium">Division</th>
            <th className="pb-2 font-medium">Birth years</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-steel/10">
              <td className="py-2 font-semibold">{row.division}</td>
              <td className="py-2 text-ink/70">
                {row.birthYearStart}–{row.birthYearEnd}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
