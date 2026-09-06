import Link from "next/link";
import { prisma } from "@/lib/db";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const documents = await prisma.siteDocument.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          Back to admin
        </Link>
        <h1 className="display mt-1 text-2xl">Documents</h1>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="mb-6 text-sm text-ink/60">
          Rulebooks, forms, and other files every team/director should be
          able to view. These show up publicly at{" "}
          <Link href="/documents" className="underline hover:text-red">
            /documents
          </Link>
          .
        </p>
        <DocumentsClient
          initialDocuments={documents.map((d) => ({
            id: d.id,
            label: d.label,
            category: d.category,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
          }))}
        />
      </div>
    </div>
  );
}
