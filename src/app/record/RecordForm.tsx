"use client";

import { useEffect, useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { appConfig } from "@/config";
import { Button } from "@/components/ui/Button/Button";

interface Props {
  entry: M3UEntry;
  cacheKey: string;
  userEmail: string;
}

export default function RecordForm({ entry, cacheKey, userEmail }: Props) {
  const maximumDurationSeconds = appConfig.maxRecordingDuration;
  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1);

  const formatDateTime = (date: Date) => date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  const [startTime, setStartTime] = useState(formatDateTime(defaultStart));
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [liveNow, setLiveNow] = useState(new Date());
  const [recordNow, setRecordNow] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDurationTooLong = durationSeconds > maximumDurationSeconds;

  // 🧠 Calculate end time on the fly
  const calculatedEndTime = (() => {
    const start = recordNow ? liveNow : new Date(startTime);
    return new Date(start.getTime() + durationSeconds * 1000);
  })();

  useEffect(() => {
    if (!recordNow) return;
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [recordNow]);


  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (durationSeconds < 10) {
      setStatus({ type: "error", message: "Duration must be at least 10 seconds." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const form = new FormData();
    form.append("cacheKey", cacheKey );
    form.append("startTime", recordNow ? liveNow.toISOString() : startTime);
    form.append("duration", durationSeconds.toString());
    form.append("email", userEmail);
    form.append("recordNow", recordNow ? "true" : "false");
    form.append("baseUrl", window.location.origin);

    try {
       console.log("Sending cacheKey from RecordForm", cacheKey);
      const res = await fetch("/api/record/schedule-org", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      console.log("Server responded:", json);
      if (res.ok) {
        const { cacheKey, recordingId } = json;
        const params = new URLSearchParams({
            cacheKey,
            recordingId,
          });
          
          const target = recordNow
            ? `/record/status?${params.toString()}`
            : `/schedule`;
        console.log("Would have redirected to Redirecting to:", target);
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
  
        {/* Checkbox row - right aligned */}
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
  
        {/* Start time and Duration row */}
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
    step="60" // ⏱️ no seconds
    value={new Date(durationSeconds * 1000).toISOString().substr(11, 5)} // "HH:MM"
    onChange={(e) => {
      const [h, m] = e.target.value.split(":").map(Number);
      const newSeconds = h * 3600 + m * 60;
      setDurationSeconds(newSeconds);
    }}
    className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600"
  />
  <p className="text-sm text-gray-500">
    <span className="font-mono">{formatDuration(durationSeconds)}</span> ({durationSeconds} sec)
  </p>
  {isDurationTooLong && (
    <p className="text-sm text-red-500">
      Max allowed: {formatDuration(maximumDurationSeconds)}
    </p>
  )}
</div>

        </div>
  
        {/* Schedule Button */}
        <div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || durationSeconds > maximumDurationSeconds}
            variant="default"
            className="w-full"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Recording"}
          </Button>
        </div>
  
        {/* Status Message */}
        {status && (
          <p className={`text-sm ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
  
  
  
}
