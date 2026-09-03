"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function FlyerUpload({
  tournamentId,
  initialFlyerUrl,
}: {
  tournamentId: string;
  initialFlyerUrl: string | null;
}) {
  const router = useRouter();
  const [flyerUrl, setFlyerUrl] = useState(initialFlyerUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/flyer`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setUploading(false);
        return;
      }

      setFlyerUrl(data.url);
      setUploading(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);

    const res = await fetch(`/api/admin/tournaments/${tournamentId}/flyer`, {
      method: "DELETE",
    });

    if (res.ok) {
      setFlyerUrl(null);
      router.refresh();
    } else {
      setError("Couldn't remove the flyer.");
    }
    setUploading(false);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
        Tournament flyer
      </h3>

      {flyerUrl ? (
        <div className="mt-3">
          <div className="relative h-48 w-full max-w-xs overflow-hidden rounded-sm border border-steel/20">
            <Image
              src={flyerUrl}
              alt="Tournament flyer"
              fill
              className="object-cover"
            />
          </div>
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm font-semibold text-red hover:text-red-dark disabled:opacity-50"
            >
              Replace
            </button>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="text-sm font-semibold text-ink/50 hover:text-red disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex h-32 w-full max-w-xs flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-steel/40 text-sm text-ink/50 hover:border-red hover:text-red disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "+ Upload flyer image"}
          <span className="text-xs text-ink/40">JPG, PNG, or WebP, up to 5MB</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red">{error}</p>}
    </div>
  );
}
