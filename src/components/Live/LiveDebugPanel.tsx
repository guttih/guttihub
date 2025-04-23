"use client";
import { UserRole } from "@/types/UserRole";
import { useEffect, useState } from "react";

interface LiveJob {
    recordingId: string;
    cacheKey: string;
    name: string;
    groupTitle?: string;
    startedAt: string;
    status: string;
    format: string;
}

interface LiveDebugPanelProps {
    hideIfNone?: boolean;
    title?: string;
    userRole?: UserRole
}

export function LiveDebugPanel({ userRole,  hideIfNone = true, title = "🧪 Live Streams" }: LiveDebugPanelProps) {
    const [jobs, setJobs] = useState<LiveJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canStopStream = userRole === "admin" || userRole === "moderator" || userRole === "streamer";
    const canStopRecording = userRole === "admin" || userRole === "moderator";

    useEffect(() => {
        async function fetchLiveJobs() {
            try {
                const res = await fetch("/api/live/active");
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to load live jobs");
                setJobs(json);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }

        fetchLiveJobs();
        const interval = setInterval(fetchLiveJobs, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (!loading && hideIfNone && jobs.length === 0) {
        return null;
    }

    return (
        <div className="p-4 mt-8 border-t border-gray-600 text-white">
            <h2 className="text-lg font-bold mb-3">{title}</h2>

            {loading && <p className="text-gray-400">Loading...</p>}
            {error && <p className="text-red-500">❌ {error}</p>}

            {jobs.length === 0 && !loading && <p className="text-gray-400">No live streams running</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {jobs.map((job) => (
        <div key={job.recordingId} className="bg-gray-800 rounded p-3">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold">{job.name}</p>
                    <p className="text-sm text-gray-400">{job.groupTitle}</p>
                    <p className="text-xs text-gray-500">Started: {new Date(job.startedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-2 text-right">
                    <a
                        href={`/player?streamUrl=/api/hls-stream/${job.recordingId}/playlist`}
                        target="_blank"
                        className="text-green-400 hover:underline"
                    >
                        ▶️ Watch
                    </a>
                    { (canStopRecording || (canStopStream && job.format === "hls-live" )) && (<button
                        className="text-red-500 hover:text-red-400"
                        onClick={async () => {
                            const confirmKill = confirm(`Are you sure you want to stop stream: ${job.recordingId}?`);
                            if (!confirmKill) return;

                            try {
                                const res = await fetch("/api/live/stop", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ recordingId: job.recordingId }),
                                });

                                if (!res.ok) throw new Error("Failed to stop stream");

                                setJobs((prev) => prev.filter((j) => j.recordingId !== job.recordingId));
                            } catch (err) {
                                alert(`Failed to stop stream: ${err}`);
                                console.error(err);
                            }
                        }}
                    >
                        🔴 Kill
                    </button>)}
                </div>
            </div>
        </div>
    ))}
</div>
        </div>
    );
}
