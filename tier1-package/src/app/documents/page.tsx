import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await prisma.siteDocument.findMany({
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const byCategory = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Resources
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">Documents</h1>
          <p className="mt-3 text-white/70">
            Rulebooks, forms, and other shared paperwork for coaches and
            directors.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        {Object.entries(byCategory).map(([category, docs]) => (
          <div key={category} className="mb-10">
            <h2 className="display text-xl">{category}</h2>
            <ul className="mt-4 space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-sm border border-steel/20 bg-white px-4 py-3"
                >
                  <span className="text-sm font-semibold">{d.label}</span>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-red hover:text-red-dark"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {documents.length === 0 && (
          <p className="text-sm text-ink/60">
            No documents have been posted yet.
          </p>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
