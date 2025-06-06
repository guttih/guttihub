"use client";

import { useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";
import RecordingMonitor from "@/components/RecordingMonitor/RecordingMonitor";

interface Props {
    job: RecordingJob;
}

export default function StatusClient({ job }: Props) {
    const [status, setStatus] = useState<string>("loading");
    const [isStopping, setIsStopping] = useState(false);
    const [isStopped, setIsStopped] = useState(false);

    async function handleStopRecording(): Promise<void> {
        // calling src/app/api/record/stop/route.ts
        if (isStopping || isStopped) return;
        setIsStopping(true);
        // const ret = await fetch(`/api/record/stop?recordingId=${job.recordingId}`);
        const res = await fetch("/api/live/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cacheKey: job.cacheKey }),
        });

        if (res.status === 200) {
            setIsStopped(true);
            setStatus("Stop initiated");
        } else {
            setIsStopped(false);
            setStatus("Error stopping recording");
        }
    }

    function extractDirAndFileName(outputFile: string, removeExtension: boolean): string {
        // Extract the directory and filename whice come after /videos/
        const i = outputFile.indexOf("/videos/");
        const outputFileDir = i !== -1 ? outputFile.substring(i + 8) : outputFile;
        return removeExtension ? outputFileDir.substring(0, outputFileDir.lastIndexOf(".")) : outputFileDir;
    }

    function extractFileName(outputFile: string): import("react").ReactNode {
        // Extract the filename from the outputFile path
        const parts = outputFile.split("/");
        return parts[parts.length - 1];
    }

    return (
        <div className="p-6 text-sm text-gray-300 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Recording</h1>
            </div>
            <div className="space-y-1 text-xs text-gray-400 border border-gray-700 rounded p-3 bg-gray-900">
                {job.cacheKey && !isStopped && (
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

                {job.cacheKey && isStopped && (
                    <div className="mt-2">
                        <strong>Recording:</strong>{" "}
                        <a
                            href={`/player?streamUrl=/api/video/${extractDirAndFileName(job.outputFile, false)}`}
                            className="text-blue-400 underline break-all"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {extractFileName(job.outputFile)}
                        </a>
                    </div>
                )}
            </div>
            <RecordingMonitor cacheKey={job.cacheKey} onStopRecording={handleStopRecording} />
            {status === "done" && (
                <div className="mt-6 text-green-400 bg-green-900 border border-green-700 rounded p-3 text-sm">
                    ✅ Recording complete! You may close this tab or open the output file above.
                </div>
            )}
        </div>
    );
}
