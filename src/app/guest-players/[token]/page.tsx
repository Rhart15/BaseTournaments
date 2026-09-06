import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import GuestPlayerForm from "./GuestPlayerForm";

export default async function GuestPlayerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-lg px-6 py-16">
        <h1 className="display text-3xl">Add a guest player</h1>
        <p className="mt-2 text-sm text-ink/60">
          Fill this out to add a guest player to the roster for this
          tournament.
        </p>
        <div className="mt-8">
          <GuestPlayerForm token={token} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
