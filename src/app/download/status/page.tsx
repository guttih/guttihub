"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { showMessageBox } from "@/components/ui/MessageBox";
import { DownloadJob } from "@/types/DownloadJob";
import DownloadMonitor from "@/components/DownloadMonitor/DownloadMonitor";

function StatusPageContent() {
  const searchParams = useSearchParams();
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [hasShownError, setHasShownError] = useState(false);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = searchParams?.get("cacheKey") ?? null;
    if (!key && !hasShownError) {
      showMessageBox({
        title: "Missing cacheKey",
        message: "No download found — check the link and try again.",
        variant: "error",
        displayTime: null,
        blocking: true,
        toast: false,
        position: "center",
        buttonText: "OK"
      });
      setHasShownError(true);
      return;
    }
    setCacheKey(key);
  }, [searchParams, hasShownError]);

  useEffect(() => {
    if (!cacheKey) return;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/download/job?cacheKey=${cacheKey}`);
        const json = await res.json();
        if (!res.ok || !json?.cacheKey) throw new Error("Invalid job data");
        setJob(json);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load download job.");
        }
      }
    };

    fetchJob();
  }, [cacheKey]);

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!job) return <div className="p-6 text-gray-400">Loading download job info...</div>;

  return <DownloadMonitor cacheKey={job.cacheKey} />;
}

export default function DownloadStatusPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading page...</div>}>
      <StatusPageContent />
    </Suspense>
  );
}
