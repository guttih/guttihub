// src/components/RecordingMonitor/RecordingMonitor.tsx
"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import { ProgressBarTime } from "@/components/ProgressBarTime/ProgressBarTime";

interface MonitorData {
    cacheKey: string;
    recordingId?: string;
    user?: string;
    duration?: number;
    createdAt?: string;
    outputFile?: string;
    currentStatus: string;
    statusLines: string[];
    logLines: string[];
    startedAt?: string;
    expectedStop?: string;
    serverTime?: string;
    intervalMs?: number;
    log: string;
    status: Record<string, string>;
}

export default function RecordingMonitor({ cacheKey, recordingId, intervalMs = 2000 }: MonitorData) {
    const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let mounted = true;

        const fetchMonitorData = async () => {
            try {
                const params = new URLSearchParams();
                if (cacheKey) params.set("cacheKey", cacheKey);
                if (recordingId) params.set("recordingId", recordingId);

                const res = await fetch(`/api/record/monitor?${params.toString()}`);
                const json = await res.json();

                if (!res.ok) throw new Error(json.error || "Failed to fetch monitor data");

                if (mounted) setMonitorData(json);
            } catch (err) {
                console.error("❌ Monitor fetch failed:", err);
                if (mounted) setError((err as Error).message);
            }
        };

        fetchMonitorData();
        interval = setInterval(fetchMonitorData, intervalMs);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [cacheKey, recordingId, intervalMs]);

    if (error) {
        return <div className="p-4 text-red-400">❌ {error}</div>;
    }

    if (!monitorData) {
        return <div className="p-4 text-gray-400">Loading monitor info...</div>;
    }

    function getStatusColor(status: string) {
        switch (status) {
            case "recording":
                return "bg-yellow-500 text-black";
            case "done":
                return "bg-green-600 text-white";
            case "stopped":
                return "bg-blue-500 text-white";
            case "error":
                return "bg-red-600 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    }

    return (
        <div className="space-y-6 p-4">
            {/* Top status box */}
            <div className="bg-gray-900 p-4 rounded-xl shadow-md space-y-2">
                <h2 className="text-2xl font-bold mb-4">Recording Monitor</h2>

                <div className="text-sm space-y-1 mb-4">
                    <div>
                        <b>Recording ID:</b> {monitorData?.recordingId ?? "(unknown)"}
                    </div>
                    <div>
                        <b>cacheKey:</b> {monitorData?.cacheKey}
                    </div>
                    <div>
                        <b>user:</b> {monitorData?.user ?? "(unknown)"}
                    </div>
                    <div>
                        <b>duration:</b> {monitorData?.duration ? `${monitorData.duration}s` : "?"}
                    </div>
                    <div>
                        <b>createdAt:</b> {monitorData?.createdAt ?? "(unknown)"}
                    </div>
                    {monitorData.outputFile && (
                        <div>
                            <b>Output:</b>{" "}
                            <a
                                href={`/${monitorData.outputFile.replace(/^public\//, "")}`}
                                className="text-blue-400 underline hover:text-blue-300"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Live Stream playlist
                            </a>
                        </div>
                    )}
                </div>

                {/* Recording Status */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">Recording Status:</span>
                    <StatusBadge status={monitorData?.currentStatus ?? "unknown"} />
                </div>

                {/* Progress Bar */}
                {monitorData &&
                    monitorData.startedAt &&
                    monitorData.expectedStop &&
                    monitorData.serverTime &&
                    !["done", "error", "stopped"].includes(monitorData?.currentStatus.toLowerCase()) && (
                        <ProgressBarTime start={monitorData.startedAt} end={monitorData.expectedStop} now={monitorData.serverTime} showTime />
                    )}

                {/* Last checked time */}
                <div className="text-xs text-gray-400 mt-2">
                    Last checked at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>

                {/* Error message if status is error */}
                {monitorData?.currentStatus?.toLowerCase().includes("error") && (
                    <div className="text-red-400 font-mono text-xs mt-2">⚠️ Something went wrong during recording</div>
                )}
            </div>

            {/* Status History */}
            <div className="bg-gray-900 p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold mb-2">Status History</h3>
                {monitorData.statusLines?.length > 0 ? (
                    <ul className="text-sm list-disc list-inside space-y-1">
                        {monitorData.statusLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-gray-400 italic">📜 No status history yet...</div>
                )}
            </div>

            {/* Live Log */}
            <div className="bg-gray-900 p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold mb-2">Live Log</h3>
                <div className="text-sm bg-gray-800 p-2 rounded overflow-y-auto max-h-60">
                    {monitorData.logLines?.length > 0 ? (
                        monitorData.logLines.map((line, idx) => <div key={idx}>{line}</div>)
                    ) : (
                        <div className="text-gray-400 italic flex items-center gap-1">
                            <span>📜</span> Waiting for logs...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
