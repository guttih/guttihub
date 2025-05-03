"use client";

import { useEffect, useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { TimePicker } from "@/components/TimePicker/TimePicker";
import { appConfig } from "@/config";

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

      {/* Duration picker */}
      <TimePicker value={durationSeconds} onChange={setDurationSeconds} label="Duration" />
      <p className="text-sm text-gray-400">
        Duration: <span className="font-mono">{formatDuration(durationSeconds)}</span> ({durationSeconds} seconds)
      </p>

      {/* Time fields */}
      {recordNow ? (
        <div className="text-sm text-gray-300 border rounded p-2 border-gray-600">
          <p><strong>Start:</strong> {liveNow.toLocaleString(undefined, { hour12: false })}</p>
          <p><strong>End:</strong> {calculatedEndTime.toLocaleString(undefined, { hour12: false })}</p>
        </div>
      ) : (
        <>
          <div>
            <label className="block mb-1 text-sm">Start Time (local)</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-800 p-2 rounded border border-gray-600"
            />
          </div>
          <p className="text-sm text-gray-300 border rounded p-2 border-gray-600">
            <strong>End:</strong> {calculatedEndTime.toLocaleString(undefined, { hour12: false })}
          </p>
        </>
      )}

      {/* Submit button */}
      <div
        title={
          isDurationTooLong
            ? `Max duration is ${formatDuration(maximumDurationSeconds)}`
            : undefined
        }
      >
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isDurationTooLong}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white disabled:opacity-50"
        >
          {isSubmitting ? "Scheduling..." : "Schedule Recording"}
        </button>
      </div>

      {isDurationTooLong && (
        <p className="text-sm text-red-500">
          Recording time exceeds the maximum allowed time {formatDuration(maximumDurationSeconds)}
        </p>
      )}

      {status && (
        <p className={`mt-4 text-sm ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {status.message}
        </p>
      )}

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
    </div>
  );
}
