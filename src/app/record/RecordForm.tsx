"use client";

import { useEffect, useMemo, useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { appConfig } from "@/config";
import { Button } from "@/components/ui/Button/Button";
import { logger } from "@/utils/logger";

interface Props {
    entry: M3UEntry;
    cacheKey: string;
    userEmail: string;
}

export default function RecordForm({ entry, cacheKey, userEmail }: Props) {
    const maximumDurationSeconds = appConfig.maxRecordingDuration;

    const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [durationSeconds, setDurationSeconds] = useState(180);
    const [liveNow, setLiveNow] = useState<Date | null>(null);
    const [recordNow, setRecordNow] = useState(true);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getServerNow = () => new Date(Date.now() + serverTimeOffsetMs);

    const formatDateTime = (date: Date) => date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const formatDuration = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
    };

    // Fetch server time on mount
    useEffect(() => {
        const fetchServerTime = async () => {
            try {
                const res = await fetch("/api/status/server");
                const data = await res.json();
                const server = new Date(data.serverTime);
                const offset = server.getTime() - Date.now();
                setServerTimeOffsetMs(offset);

                const defaultStart = new Date(server.getTime());
                defaultStart.setHours(defaultStart.getHours() + 1);
                setStartTime(formatDateTime(defaultStart));

                setLiveNow(server);

                const interval = setInterval(() => {
                    setLiveNow(new Date(Date.now() + offset));
                }, 1000);

                return () => clearInterval(interval);
            } catch (err) {
                console.error("Failed to fetch server time:", err);
            }
        };

        fetchServerTime();
    }, []);

    const calculatedEndTime = useMemo(() => {
        const start = recordNow ? getServerNow() : startTime ? new Date(startTime) : getServerNow(); // fallback if startTime is still null

        return new Date(start.getTime() + durationSeconds * 1000);
    }, [recordNow, startTime, durationSeconds, serverTimeOffsetMs]);

    const isDurationTooLong = durationSeconds > maximumDurationSeconds;

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (durationSeconds < 10) {
            setStatus({ type: "error", message: "Duration must be at least 10 seconds." });
            return;
        }

        setIsSubmitting(true);
        setStatus(null);

        const form = new FormData();
        form.append("cacheKey", cacheKey);
        form.append("startTime", recordNow ? getServerNow().toISOString() : startTime || "");
        form.append("duration", durationSeconds.toString());
        form.append("email", userEmail);
        form.append("recordNow", recordNow ? "true" : "false");
        form.append("baseUrl", window.location.origin);

        try {
            logger.log("Sending cacheKey from RecordForm", cacheKey);
            const res = await fetch("/api/record/schedule-org", {
                method: "POST",
                body: form,
            });

            const json = await res.json();
            logger.log("Server responded:", json);
            if (res.ok) {
                const { cacheKey, recordingId } = json;
                const params = new URLSearchParams({
                    cacheKey,
                    recordingId,
                });

                const target = recordNow ? `/record/status?${params.toString()}` : `/schedule`;
                window.location.href = target;
            } else {
                setStatus({ type: "error", message: json.error || "Unknown error" });
            }
        } catch {
            setStatus({ type: "error", message: "Network error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!startTime || !liveNow) {
        return <p className="text-center text-gray-400">⏳ Syncing with server time...</p>;
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-md space-y-6">
                {/* Header: Stream info */}
                <div className="flex items-center space-x-4">
                    {entry.tvgLogo && (
                        <img
                            src={entry.tvgLogo}
                            alt={`${entry.name} logo`}
                            className="w-24 h-16 object-contain border border-gray-700 bg-black rounded"
                        />
                    )}
                    <div>
                        <h2 className="text-xl font-semibold text-white">{entry.name}</h2>
                        <p className="text-sm text-gray-400">{entry.groupTitle}</p>
                    </div>
                </div>

                {/* Server time display */}
                <p className="text-sm text-right text-gray-400 font-mono">🕒 Server Time: {liveNow.toLocaleString(undefined, { hour12: false })}</p>

                {/* Checkbox row */}
                <div className="flex justify-end">
                    <label className="inline-flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="recordNow"
                            checked={recordNow}
                            onChange={(e) => setRecordNow(e.target.checked)}
                            className="accent-gray-500 w-4 h-4"
                        />
                        <span className="text-sm text-gray-300">Record immediately</span>
                    </label>
                </div>

                {/* Start + Duration */}
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                    {/* Start Time */}
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-white">Start Time</label>
                        {!recordNow && (
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600"
                            />
                        )}
                        <p className="text-sm text-gray-400">
                            <strong>End:</strong> {calculatedEndTime.toLocaleString(undefined, { hour12: false })}
                        </p>
                    </div>

                    {/* Duration */}
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium text-white">Duration</label>
                        <input
                            type="time"
                            step="60"
                            value={new Date(durationSeconds * 1000).toISOString().substr(11, 5)}
                            onChange={(e) => {
                                const [h, m] = e.target.value.split(":").map(Number);
                                setDurationSeconds(h * 3600 + m * 60);
                            }}
                            className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600"
                        />
                        <p className="text-sm text-gray-500">
                            <span className="font-mono">{formatDuration(durationSeconds)}</span> ({durationSeconds} sec)
                        </p>
                        {isDurationTooLong && <p className="text-sm text-red-500">Max allowed: {formatDuration(maximumDurationSeconds)}</p>}
                    </div>
                </div>

                {/* Button */}
                <div>
                    <Button onClick={handleSubmit} disabled={isSubmitting || isDurationTooLong} variant="default" className="w-full">
                        {isSubmitting ? "Scheduling..." : recordNow ? "Record now" : "Schedule Recording"}
                    </Button>
                </div>

                {/* Status */}
                {status && <p className={`text-sm ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>{status.message}</p>}
            </div>
        </div>
    );
}
