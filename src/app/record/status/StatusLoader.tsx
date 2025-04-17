"use client";

import { useEffect, useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";
import StatusClient from "./StatusClient";

export default function StatusLoader({ recordingId }: { recordingId: string | null }) {
  const [job, setJob] = useState<RecordingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId) {
      setError("Missing recording ID");
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/recording-status?recordingId=${recordingId}`);
        if (!res.ok) throw new Error("Status fetch failed");
        const json = await res.json();
        setJob(json);
      } catch  {
        setError("Could not load recording status");
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 5s
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [recordingId]);

  if (error) return <div className="text-red-400 p-4">{error}</div>;
  if (!job) return <div className="text-gray-400 p-4">Waiting for recording to start...</div>;

  return <StatusClient job={job} />;
}
