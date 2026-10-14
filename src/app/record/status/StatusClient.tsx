"use client";

import { useCallback, useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";
import RecordingMonitor from "@/components/RecordingMonitor/RecordingMonitor";

interface Props {
    job: RecordingJob;
}

export default function StatusClient({ job }: Props) {
    const [status, setStatus] = useState<string>("loading");
    const [isStopping, setIsStopping] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const handleStatusChange = useCallback((nextStatus: string, nextPlaybackUrl?: string | null) => {
        setStatus(nextStatus);
        setPlaybackUrl(nextPlaybackUrl ?? null);
    }, []);

    async function handleStopRecording(): Promise<void> {
        if (isStopping) return;
        setIsStopping(true);
        try {
            const res = await fetch(`/api/record/stop?cacheKey=${encodeURIComponent(job.cacheKey)}`);
            if (!res.ok) throw new Error("Error stopping recording");
        } catch {
            setStatus("Error stopping recording");
        } finally {
            setIsStopping(false);
        }
    }

    function extractDirAndFileName(outputFile: string, removeExtension: boolean): string {
        // Extract the directory and filename whice come after /videos/
        const i = outputFile.indexOf("/videos/");
        const outputFileDir = i !== -1 ? outputFile.substring(i + 8) : outputFile;
        return removeExtension ? outputFileDir.substring(0, outputFileDir.lastIndexOf(".")) : outputFileDir;
    }

    return (
        <div className="p-6 text-sm text-gray-300 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Recording</h1>
            </div>
            <div className="space-y-1 text-xs text-gray-400 border border-gray-700 rounded p-3 bg-gray-900">
                {job.cacheKey && !playbackUrl && (
                    <div className="mt-2">
                        <strong>Output:</strong>{" "}
                        <a
                            href={`/player?streamUrl=/api/${job.recordingType}-stream/${extractDirAndFileName(job.recordingId, true)}${
                                job.recordingType === "hls" ? "/playlist" : ""
                            }`}
                            className="text-blue-400 underline break-all"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {`Live Stream ${job.recordingType === "hls" ? "playlist" : "(.ts)"}`}
                        </a>
                    </div>
                )}

                {job.cacheKey && playbackUrl && (
                    <div className="mt-2">
                        <strong>Recording:</strong>{" "}
                        <a
                            href={`/player?streamUrl=${encodeURIComponent(playbackUrl!)}`}
                            className="text-blue-400 underline break-all"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Saved recording
                        </a>
                    </div>
                )}
            </div>
            <RecordingMonitor cacheKey={job.cacheKey} onStopRecording={handleStopRecording} onStatusChange={handleStatusChange} />
            {playbackUrl && ["done", "stopped"].includes(status) && (
                <div className="mt-6 text-green-400 bg-green-900 border border-green-700 rounded p-3 text-sm">
                    ✅ Recording complete! You may close this tab or open the output file above.
                </div>
            )}
        </div>
    );
}
