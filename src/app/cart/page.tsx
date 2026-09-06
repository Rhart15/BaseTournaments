import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CartClient from "./CartClient";

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="display text-4xl">Your cart</h1>
        <p className="mt-2 text-ink/60">
          Register multiple teams or events in one checkout.
        </p>
        <div className="mt-8">
          <CartClient />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
