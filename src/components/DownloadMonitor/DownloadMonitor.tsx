// src/components/DownloadMonitor/DownloadMonitor.tsx
"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import ProgressBarPercent from "../ProgressBarPercent/ProgressBarPercent";
import { formatBytes } from "@/utils/downloadStatusParser";

export interface DownloadMonitorData {
    cacheKey: string;
    recordingId?: string;
    user?: string;
    createdAt?: string;
    outputFile?: string;
    currentStatus: string;
    statusLines: string[];
    logLines: string[];
    serverTime?: string;
    status: Record<string, string>;
    progressPercent?: number;
    contentLength?: number;
}

interface DownloadMonitorProps {
    cacheKey?: string;
    recordingId?: string;
    intervalMs?: number;
}

export default function DownloadMonitor({ cacheKey, recordingId, intervalMs = 2000 }: DownloadMonitorProps) {
    const [monitorData, setMonitorData] = useState<DownloadMonitorData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stopCountdown, setStopCountdown] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchMonitorData = async () => {
            try {
                const params = new URLSearchParams();
                if (cacheKey) params.set("cacheKey", cacheKey);
                if (recordingId) params.set("recordingId", recordingId);

                const res = await fetch(`/api/download/monitor?${params.toString()}`);
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to fetch monitor data");

                if (mounted) {
                    setMonitorData(json);
                    const lowerStatus = json.currentStatus?.toLowerCase();
                    if (["done", "error"].includes(lowerStatus)) {
                        if (stopCountdown === null) {
                            setStopCountdown(5);
                        }
                    } else {
                        setStopCountdown(null);
                    }
                }
            } catch (err) {
                console.error("❌ Download monitor fetch failed:", err);
                if (mounted) setError((err as Error).message);
            }
        };

        fetchMonitorData();
        const interval = setInterval(() => {
            if (stopCountdown !== null && stopCountdown <= 0) {
                clearInterval(interval);
            } else {
                fetchMonitorData();
                if (stopCountdown !== null) {
                    setStopCountdown((prev) => (prev !== null ? prev - 1 : null));
                }
            }
        }, intervalMs);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [cacheKey, recordingId, intervalMs, stopCountdown]);

    if (error) return <div className="p-4 text-red-400">❌ {error}</div>;
    if (!monitorData) return <div className="p-4 text-gray-400">Loading download monitor info...</div>;

    return (
        <div className="space-y-6 p-4">
            <div className="bg-gray-900 p-4 rounded-xl shadow-md space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Download Monitor</h2>
                </div>

                <div className="text-sm space-y-1 mb-4">
                    <div>
                        <b>Download ID:</b> {monitorData.recordingId ?? "(unknown)"}
                    </div>
                    <div>
                        <b>cacheKey:</b> {monitorData.cacheKey}
                    </div>
                    <div>
                        <b>user:</b> {monitorData.user ?? "(unknown)"}
                    </div>
                    <div>
                        <b>createdAt:</b> {monitorData.createdAt ?? "(unknown)"}
                    </div>
                    <div>
                        <b>Total Size:</b> {monitorData?.contentLength ? formatBytes(Number(monitorData.contentLength)) : "Unknown"}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">Download Status:</span>
                    <StatusBadge status={monitorData?.currentStatus ?? "unknown"} />
                </div>

                {typeof monitorData.progressPercent === "number" && <ProgressBarPercent percent={monitorData.progressPercent} />}

                <div className="text-xs text-gray-400 mt-2">
                    Last checked at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>

                {monitorData?.currentStatus?.toLowerCase().includes("error") && (
                    <div className="text-red-400 font-mono text-xs mt-2">⚠️ Something went wrong during download</div>
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
