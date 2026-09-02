import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CoachesCornerPage() {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">
            Coach&apos;s corner
          </p>
          <h1 className="display mt-4 text-5xl font-semibold">
            Tips, updates, and stories
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        {posts.length === 0 ? (
          <p className="text-sm text-ink/60">
            No posts have been published yet — check back soon.
          </p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <article key={post.id} className="border-b border-steel/10 pb-10">
                <Link href={`/coaches-corner/${post.slug}`}>
                  <h2 className="display text-2xl hover:text-red">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-ink/70">{post.excerpt}</p>
                )}
                {post.publishedAt && (
                  <p className="mt-3 text-xs uppercase tracking-wide text-ink/50">
                    {post.publishedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
