"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StatusClient from "./StatusClient";
import { RecordingJob } from "@/types/RecordingJob";

export default function StatusLoader() {
  const searchParams = useSearchParams();
  const cacheKey = searchParams.get("cacheKey");
  const [job, setJob] = useState<RecordingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setError("Missing cache key.");
      return;
    }

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/recording-job?cacheKey=${cacheKey}`);
        if (!res.ok) {
          throw new Error("Could not load job");
        }
        const json = await res.json();
        setJob(json);
      } catch (err) {
        setError("Failed to load job");
      }
    };

    fetchJob();
  }, [cacheKey]);

  if (error) return <div className="text-red-400 p-4">{error}</div>;
  if (!job) return <div className="text-gray-400 p-4">Loading job metadata...</div>;

  return <StatusClient job={job} />;
}
