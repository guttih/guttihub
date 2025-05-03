"use client";
import { hasRole, UserRole } from "@/utils/auth/accessControl";
import { useEffect, useState } from "react";
import { showMessageBox } from "../ui/MessageBox";
import {
  MonitorCardDownload,
  MonitorCardRecording,
  MonitorCardStream,
} from "../cards/MonitorCard";

interface LiveJob {
  recordingId: string;
  cacheKey: string;
  name: string;
  groupTitle?: string;
  startedAt: string;
  status: string;
  format: string;
  serviceName?: string;
  tvgLogo?: string;
  duration?: number;
}

interface LiveMonitorPanelProps {
  hideIfNone?: boolean;
  title?: string;
  userRole: UserRole;
  onInlinePlay?: (url: string) => void;
}

// ✅ Util to validate + encode logo URLs
function getSafeLogoUrl(url?: string): string | undefined {
  if (
    typeof url === "string" &&
    /^https?:\/\/.+\.(jpg|jpeg|png|webp|svg)$/i.test(url)
  ) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return undefined;
}

export function LiveMonitorPanel({
  userRole,
  hideIfNone = true,
  title = "🧪 Live Streams",
  onInlinePlay,
}: LiveMonitorPanelProps) {
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canStopStream = hasRole(userRole, "streamer");
  const canStopRecording = hasRole(userRole, "moderator");

  useEffect(() => {
    async function fetchLiveJobs() {
      try {
        const res = await fetch("/api/live/active");
        const contentType = res.headers.get("content-type") ?? "";
  
        if (!res.ok || !contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Server Error (${res.status}): ${text.slice(0, 80)}...`);
        }
  
        const json = await res.json();
        setJobs(json);
        setError(null); // ✅ Clear error if fetch succeeds
      } catch (err) {
        console.error("Error fetching live jobs:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  
    fetchLiveJobs();
    const interval = setInterval(fetchLiveJobs, 5000);
    return () => clearInterval(interval);
  }, []);
  

  function handleKill(cacheKey: string) {
    fetch("/api/live/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cacheKey }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to stop job");
        }
        setJobs((prev) => prev.filter((j) => j.cacheKey !== cacheKey));
      })
      .catch((err) => {
        showMessageBox({
          variant: "error",
          title: "Error",
          message: `Failed to stop job: ${err}`,
        });
      });
  }

  function makeWhachableRecordingUrl(recordingId: string) {
    const withoutExtension = recordingId.replace(/\.[^/.]+$/, "");
    return `/player?streamUrl=/api/hls-stream/${withoutExtension}/playlist`;
  }

  if (!loading && hideIfNone && jobs.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-screen-xl mx-auto p-4 mt-8 border-t border-gray-600 text-white">
      <h2 className="text-lg font-bold mb-3">{title}</h2>

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-500">❌ {error}</p>}
      {jobs.length === 0 && !loading && (
        <p className="text-gray-400">No live streams running</p>
      )}

      <div className="grid gap-6 justify-center grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
        {jobs.map((job) => {
          const logoUrl = getSafeLogoUrl(job.tvgLogo);

          const commonProps = {
            name: job.name,
            groupTitle: job.groupTitle,
            logoUrl,
            serviceName: job.serviceName,
            startedAt: job.startedAt,
            status: job.status,
          };

          if (job.status === "live" && job.format === "hls-live") {
            return (
              <MonitorCardStream
                key={job.recordingId}
                {...commonProps}
                cacheKey={job.cacheKey}
                onKill={canStopStream ? () => handleKill(job.cacheKey) : undefined}
                onInlinePlay={onInlinePlay}
                watchUrl={makeWhachableRecordingUrl(job.recordingId)}
              />
            );
          } else if (job.status === "recording") {
            return (
              <MonitorCardRecording
                key={job.recordingId}
                {...commonProps}
                cacheKey={job.cacheKey}
                watchUrl={makeWhachableRecordingUrl(job.recordingId)}
                duration={job.duration}
                onKill={canStopRecording ? () => handleKill(job.cacheKey) : undefined}
              />
            );
          } else if (job.status === "downloading") {
            return (
              <MonitorCardDownload
                key={job.recordingId}
                {...commonProps}
                cacheKey={job.cacheKey}
                onKill={canStopRecording ? () => handleKill(job.cacheKey) : undefined}
              />
            );
          } else {
            return null;
          }
        })}
      </div>
    </div>
  );
}
