"use client";

import { useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge/StatusBadge";
import { ProgressBarTime } from "@/components/ProgressBarTime/ProgressBarTime";

interface Props {
    recordingId: string;
    intervalMs?: number;
    onStatusChange?: (status: string) => void;
}

export function LiveStatusViewer({ recordingId, intervalMs = 3000, onStatusChange }: Props) {
    const [statusMap, setStatusMap] = useState<Record<string, string> | null>(null);
    const [loading, setLoading] = useState(true);

    const donePollCount = useRef(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/record/status?recordingId=${recordingId}`);
                const json = await res.json();

                if (!mounted) return;

                setStatusMap((prev) => {
                    if (JSON.stringify(prev) !== JSON.stringify(json)) return json;
                    return prev;
                });

                // ✅ Emit status upward
                if (json.STATUS && onStatusChange) {
                    console.log("🟢 onStatusChange fired with:", json.STATUS);
                    onStatusChange(json.STATUS);
                }

                // 🛑 Stop polling after 5 "done"/"error" confirmations
                if (json.STATUS === "done" || json.STATUS === "stopped" || json.STATUS === "error") {
                    donePollCount.current += 1;
                    if (donePollCount.current >= 5) {
                        console.log("🛑 Stopping polling after 5 post-done fetches");
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                    }
                } else {
                    donePollCount.current = 0; // reset
                }
            } catch {
                if (mounted) {
                    setStatusMap({ STATUS: "error", ERROR: "Could not fetch status" });
                    if (onStatusChange) onStatusChange("error");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchStatus(); // initial
        intervalRef.current = setInterval(fetchStatus, intervalMs);

        return () => {
            mounted = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [recordingId, intervalMs, onStatusChange]);

    return (
        <div className="bg-gray-800 p-4 rounded text-sm space-y-1 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Recording Status:</span>
                <StatusBadge status={statusMap?.STATUS || "unknown"} />
            </div>

            {statusMap?.STATUS === "preparing" && <div className="text-gray-400">Waiting for recording to start...</div>}

            {!statusMap && loading && <div className="text-gray-400">Loading status...</div>}

            {statusMap?.STATUS === "recording" && statusMap?.STARTED_AT && statusMap?.EXPECTED_STOP && statusMap?.SERVER_TIME && (
                <ProgressBarTime start={statusMap.STARTED_AT} end={statusMap.EXPECTED_STOP} now={statusMap.SERVER_TIME} />
            )}

            {statusMap &&
                statusMap.STATUS !== "preparing" &&
                Object.entries(statusMap).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                        <span className="font-medium text-gray-400">{key}</span>
                        <span className="text-gray-100">{value}</span>
                    </div>
                ))}
        </div>
    );
}
