"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import RecordForm from "./RecordForm";
import { M3UEntry } from "@/types/M3UEntry";

export default function RecordClient() {
  const searchParams = useSearchParams();
  const cacheKey = searchParams?.get("cacheKey") ?? "";
  const [entry, setEntry] = useState<M3UEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("unknown");

  useEffect(() => {
    const fetchEntry = async () => {
      if (!cacheKey) {
        setError("Missing cacheKey");
        return;
      }

      try {
        const res = await fetch(`/api/cache/${cacheKey}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch entry");
        setEntry(data.entry);
        setUserEmail(data.email ?? "unknown");
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchEntry();
  }, [cacheKey]);

  if (error) {
    return <div className="p-4 text-red-400">❌ {error}</div>;
  }

  if (!entry) {
    return <div className="p-4 text-gray-400">Loading stream info...</div>;
  }

  return <RecordForm entry={entry} cacheKey={cacheKey!} userEmail={userEmail} />;
}
