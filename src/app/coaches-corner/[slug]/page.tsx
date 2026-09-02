import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoachesCornerPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });

  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-3xl px-6">
          {post.publishedAt && (
            <p className="text-sm uppercase tracking-[0.3em] text-gold">
              {post.publishedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <h1 className="display mt-4 text-4xl font-semibold sm:text-5xl">
            {post.title}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="whitespace-pre-line text-lg leading-relaxed text-ink/80">
          {post.body}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
