"use client";

import { useState, useRef } from "react";

type Doc = {
  id: string;
  label: string;
  category: string;
  fileUrl: string;
  fileName: string;
};

export default function DocumentsClient({
  initialDocuments,
}: {
  initialDocuments: Doc[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("General");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file || !label.trim()) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label);
    formData.append("category", category);

    const res = await fetch("/api/admin/documents", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setDocuments((prev) => [data.document, ...prev]);
      setLabel("");
      if (fileInput.current) fileInput.current.value = "";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't upload that file.");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div>
      <form
        onSubmit={handleUpload}
        className="mb-8 grid grid-cols-2 gap-3 rounded-sm border border-steel/20 bg-white p-6 sm:grid-cols-4"
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Document name (e.g. 2026 Rulebook)"
          required
          className="col-span-2 rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        >
          <option>General</option>
          <option>Rules</option>
          <option>Forms</option>
        </select>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          className="rounded-sm border border-steel/40 px-2 py-2 text-xs"
        />
        <button
          type="submit"
          disabled={uploading}
          className="col-span-2 rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60 sm:col-span-4"
        >
          {uploading ? "Uploading..." : "+ Upload document"}
        </button>
        {error && <p className="col-span-2 text-sm text-red sm:col-span-4">{error}</p>}
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steel/30 text-left text-ink/50">
            <th className="py-2">Name</th>
            <th>Category</th>
            <th>File</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className="border-b border-steel/10">
              <td className="py-3 font-semibold">{d.label}</td>
              <td>{d.category}</td>
              <td>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red hover:text-red-dark"
                >
                  {d.fileName}
                </a>
              </td>
              <td className="text-right">
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-xs font-semibold text-ink/50 hover:text-red"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-ink/50">
                No documents uploaded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
