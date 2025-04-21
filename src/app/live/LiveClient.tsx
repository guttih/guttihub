"use client";

import { useSearchParams } from "next/navigation";
import { InlinePlayer } from "@/components/InlinePlayer/InlinePlayer";
import { useEffect, useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { Spinner } from "@/components/Spinner/Spinner";

export default function LiveClient() {
  const searchParams = useSearchParams();
  const cacheKey = searchParams.get("cacheKey");

  const [entry, setEntry] = useState<M3UEntry | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchRecordingId() {
      if (!cacheKey) {
        setError("Missing cacheKey");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/live/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cacheKey }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to start stream");

        setRecordingId(json.recordingId);
        setEntry(json.entry);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecordingId();
  }, [cacheKey]);

  if (loading) return <div className="p-4 text-gray-400"><Spinner /> Starting stream...</div>;
  if (error) return <div className="p-4 text-red-400">❌ {error}</div>;
  if (!recordingId || !entry) return <div className="p-4 text-red-400">❌ Invalid stream state</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-white">🔴 Live: {entry.name}</h1>
      <InlinePlayer
        url={`/api/hls-stream/${recordingId}/playlist`}
        showCloseButton={false}
        className="w-full max-w-4xl mx-auto rounded shadow"
      />
    </div>
  );
}
