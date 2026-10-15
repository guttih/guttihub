"use client";
import { hasRole, UserRole } from "@/utils/auth/accessControl";
import { useEffect, useState } from "react";
import { showMessageBox } from "../../ui/MessageBox";
import { MonitorCardDownload, MonitorCardRecording, MonitorCardStream, MonitorCardMovie } from "@/components/cards/MonitorCard";
import { EnrichedJob } from "@/types/EnrichedJob";

interface LiveMonitorPanelProps {
    hideIfNone?: boolean;
    title?: string;
    userRole: UserRole;
    onInlinePlay?: (url: string) => void;
}

// ✅ Util to validate + encode logo URLs
function getSafeLogoUrl(url?: string): string | undefined {
    if (typeof url === "string" && /^https?:\/\/.+\.(jpg|jpeg|png|webp|svg)$/i.test(url)) {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return undefined;
}

export function LiveMonitorPanel({ userRole, hideIfNone = true, title = "Active Connections", onInlinePlay }: LiveMonitorPanelProps) {
    const [jobs, setJobs] = useState<EnrichedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [keepAtTop, setKeepAtTop] = useState(false);

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
        console.log("Stopping job with cacheKey:", cacheKey);
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
        <div className={`w-full max-w-screen-xl mx-auto p-4 mt-8 mb-6 border-t border-gray-600 bg-black text-white ${keepAtTop ? "sticky top-0 z-20 max-h-dvh overflow-y-auto" : ""}`}>
            <h2 className="text-lg font-bold mb-3">{title}</h2>

            {loading && <p className="text-gray-400">Loading...</p>}
            {error && <p className="text-red-500">❌ {error}</p>}
            {jobs.length === 0 && !loading && <p className="text-gray-400">No live streams running</p>}

            <div className="grid gap-6 justify-center grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
                {jobs.map((job) => {
                    const logoUrl = getSafeLogoUrl(job.tvgLogo);

                    const commonProps = {
                        name: job.name,
                        groupTitle: job.groupTitle,
                        logoUrl,
                        serviceName: job.serviceName,
                        startedAt: job.startedAt,
                        user: job.user,
                        status: job.status,
                    };

                    const renderCard = () => {
                        if (job.status === "live" && job.format === "hls-live") {
                            return (
                                <MonitorCardStream
                                    key={job.cacheKey}
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
                                    key={job.cacheKey}
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
                                    key={job.cacheKey}
                                    {...commonProps}
                                    cacheKey={job.cacheKey}
                                    onKill={canStopRecording ? () => handleKill(job.cacheKey) : undefined}
                                />
                            );
                        } else if (job.status === "playing") {
                            return (
                                <MonitorCardMovie
                                    key={job.cacheKey}
                                    {...commonProps}
                                    cacheKey={job.cacheKey}
                                    onKill={canStopRecording ? () => handleKill(job.cacheKey) : undefined}
                                />
                            );
                        } else {
                            return null;
                        }
                    };

                    return (
                        <div key={job.cacheKey} className="relative">
                            <button
                                type="button"
                                aria-label={keepAtTop ? "Unpin monitor panel" : "Pin monitor panel to top"}
                                title={keepAtTop ? "Unpin monitor panel" : "Pin monitor panel to top"}
                                aria-pressed={keepAtTop}
                                onClick={() => setKeepAtTop((pinned) => !pinned)}
                                className={`absolute right-1 top-1 rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400 ${keepAtTop ? "text-purple-400 hover:text-purple-300" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${keepAtTop ? "" : "rotate-45"}`}>
                                    <path d="M9 3h6l-1 7 4 4v2H6v-2l4-4-1-7Z" fill={keepAtTop ? "currentColor" : "none"} />
                                    <path d="M12 16v6" />
                                </svg>
                            </button>
                            {renderCard()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
