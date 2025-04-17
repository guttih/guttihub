"use client";

import { useEffect, useState } from "react";
import StatusBadge from "../StatusBadge/StatusBadge";

interface Props {
  recordingId: string;
  intervalMs?: number;
}

export function LiveStatusViewer({ recordingId, intervalMs = 3000 }: Props) {
  const [statusMap, setStatusMap] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/recording-status?recordingId=${recordingId}`);
        const json = await res.json();

        if (!mounted) return;

        if (json.status === "unknown") {
          setStatusMap({ STATUS: "preparing" });
        } else {
          const clean = { ...json };
          delete clean.log;
          setStatusMap(clean);
        }
      } catch {
        if (mounted) {
          setStatusMap({ STATUS: "error", ERROR: "Could not fetch status" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, intervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [recordingId, intervalMs]);

  return (
    <div className="bg-gray-800 p-4 rounded text-sm space-y-1 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold">Recording Status:</span>
        <StatusBadge status={statusMap?.STATUS || "unknown"} />
      </div>

      {statusMap?.STATUS === "preparing" && (
        <div className="text-gray-400">Waiting for recording to start...</div>
      )}

      {!statusMap && loading && (
        <div className="text-gray-400">Loading status...</div>
      )}

      {statusMap && statusMap.STATUS !== "preparing" &&
        Object.entries(statusMap).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-medium text-gray-400">{key}</span>
            <span className="text-gray-100">{value}</span>
          </div>
        ))}
    </div>
  );
}
