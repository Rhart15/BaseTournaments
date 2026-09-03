"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkHandledButton({ id }: { id: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    setSaving(true);
    const res = await fetch(`/api/admin/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handled: true }),
    });
    if (res.ok) {
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="text-xs font-semibold text-red hover:text-red-dark disabled:opacity-50"
    >
      {saving ? "Saving..." : "Mark handled"}
    </button>
  );
}
