"use client";

import { useState, useEffect } from "react";
import { M3UEntry } from "@/types/M3UEntry";

interface Props {
    entry: M3UEntry;
    cacheKey: string;
    userEmail: string;
}

export default function RecordForm({ entry, cacheKey, userEmail }: Props) {
    console.log("📍 Current page at load:", window.location.href);
    const [startTime, setStartTime] = useState("");
    const [duration, setDuration] = useState("10"); // default 3 minutes
    const [location, setLocation] = useState("");
    const [folders, setFolders] = useState<{ label: string; path: string }[]>([]);
    const [recordNow, setRecordNow] = useState(true); // default true for dev

    useEffect(() => {
        const fetchFolders = async () => {
            const res = await fetch("/api/output-folders");
            const data = await res.json();
            setFolders(data);

            // ✅ Only set if location is still empty
            if (!location && data.length > 0) {
                setLocation(data[0].path);
            }
        };

        fetchFolders();
    }, []);

    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        console.log("⏱ Scheduling recording...");
        setIsSubmitting(true);
        setStatus(null);

        const form = new FormData();
        form.append("cacheKey", cacheKey);
        form.append("startTime", startTime);
        form.append("duration", duration);
        form.append("location", location);
        form.append("email", userEmail);
        form.append("recordNow", "true");

        try {
            const res = await fetch("/api/record/schedule", {
                method: "POST",
                body: form,
            });

            const json = await res.json();
            console.log("📦 schedule-recording response:", res.status, json);

            if (res.ok) {
                const target = `/record/status?recordingId=${json.recordingId}`;
                console.log("✅ Redirecting to:", target);
              
                // Try this first:
                window.location.href = target;
                
                // console.log("✅ Redirecting to status page with ID:", json.recordingId);
                // console.log("🔗 Full URL:", `/record/status?recordingId=${json.recordingId}`);
                // router.push(`/record/status?recordingId=${json.recordingId}`);
                // // window.location.href = `/record/status?cacheKey=${cacheKey}`;
            } else {
                console.warn("❌ Schedule failed:", json.error);
                setStatus({ type: "error", message: json.error || "Unknown error" });
            }
        } catch (err) {
            console.error("❌ Network error:", err);
            setStatus({ type: "error", message: "Network error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="recordNow"
                    checked={recordNow}
                    onChange={(e) => setRecordNow(e.target.checked)}
                    className="form-checkbox"
                />
                <label htmlFor="recordNow" className="text-sm">
                    Record Now (immediate)
                </label>
            </div>
            {!recordNow && (
                <div>
                    <label className="block mb-1 text-sm">Start Time (local)</label>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-gray-800 p-2 rounded border border-gray-600"
                    />
                </div>
            )}

            <div>
                <label className="block mb-1 text-sm">Duration (seconds)</label>
                <input
                    type="number"
                    min="10"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-gray-800 p-2 rounded border border-gray-600"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white disabled:opacity-50"
            >
                {isSubmitting ? "Scheduling..." : "Schedule Recording"}
            </button>

            {status && <p className={`mt-4 text-sm ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>{status.message}</p>}
            <p className="text-sm text-gray-400 border-t border-gray-700 pt-4">
                <strong>Stream:</strong> {entry.name}
                <br />
                <strong>Group:</strong> {entry.groupTitle}
                <br />
                {entry.tvgLogo && (
                    <img
                        src={entry.tvgLogo}
                        alt={`${entry.name} logo`}
                        className="w-32 h-20 object-contain mt-2 border border-gray-600 bg-black p-1 rounded"
                    />
                )}
            </p>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-gray-800 p-2 rounded border border-gray-600">
                {folders.map((f) => (
                    <option key={f.path} value={f.path}>
                        {f.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
