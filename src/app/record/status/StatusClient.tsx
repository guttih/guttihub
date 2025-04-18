"use client";

import { useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";
import { LiveStatusViewer } from "@/components/LiveStatusViewer/LiveStatusViewer";
import { LiveLogViewer } from "@/components/LiveLogViewer/LiveLogViewer";
import StatusBadge from "@/components/StatusBadge/StatusBadge";

interface Props {
  job: RecordingJob;
}

export default function StatusClient({ job }: Props) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [status, setStatus] = useState<string>("loading");


  return (
    <div className="p-6 text-sm text-gray-300 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Recording Status</h1>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-1 text-xs text-gray-400 border border-gray-700 rounded p-3 bg-gray-900">
        <div><strong>recordingId:</strong> {job.recordingId}</div>
        <div><strong>cacheKey:</strong> {job.cacheKey}</div>
        <div><strong>user:</strong> {job.user}</div>
        <div><strong>duration:</strong> {job.duration}s</div>
        <div><strong>createdAt:</strong> {new Date(job.createdAt).toLocaleString()}</div>
        {job.outputFile && (
          <div className="mt-2">
            <strong>Output:</strong>{" "}
            <a
              href={`file://${job.outputFile}`}
              className="text-blue-400 underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {job.outputFile}
            </a>
          </div>
        )}
      </div>

      <LiveStatusViewer
  recordingId={job.recordingId}
  intervalMs={3000}
  onStatusChange={setStatus}
/>

      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="font-semibold">Live Log</h2>
        <label className="text-xs flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="form-checkbox"
          />
          Autoscroll
        </label>
      </div>

      <LiveLogViewer recordingId={job.recordingId} intervalMs={2000} autoScroll={autoScroll} />

      {status === "done" && (
        <div className="mt-6 text-green-400 bg-green-900 border border-green-700 rounded p-3 text-sm">
          ✅ Recording complete! You may close this tab or open the output file above.
        </div>
      )}
    </div>
  );
}
