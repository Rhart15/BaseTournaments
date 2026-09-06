import Link from "next/link";
import { prisma } from "@/lib/db";
import DiscountCodesClient from "./DiscountCodesClient";

export const dynamic = "force-dynamic";

export default async function DiscountCodesPage() {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to admin
        </Link>
        <h1 className="display mt-1 text-2xl">Discount codes</h1>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="mb-6 text-sm text-ink/60">
          Codes a customer types in at checkout. A team also automatically
          gets 10% off when it&apos;s the 2nd+ team the same coach email
          registers for the same tournament -- that one applies on its own
          and doesn&apos;t need a code here.
        </p>
        <DiscountCodesClient
          initialCodes={codes.map((c) => ({
            id: c.id,
            code: c.code,
            type: c.type,
            value: c.value,
            maxUses: c.maxUses,
            usedCount: c.usedCount,
            active: c.active,
            expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          }))}
        />
      </div>
    </div>
  );
}
