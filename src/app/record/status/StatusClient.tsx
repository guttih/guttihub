"use client";

import { useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";
import { LiveStatusViewer } from "@/components/LiveStatusViewer/LiveStatusViewer";
// import { LiveLogViewer } from "@/components/LiveLogViewer/LiveLogViewer";

interface Props {
  job: RecordingJob;
}

export default function StatusClient({ job }: Props) {
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <div className="p-6 text-sm text-gray-300 max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Recording Status</h1>
      <div>cacheKey: {job.cacheKey}</div>
      <LiveStatusViewer recordingId={job.recordingId} />

      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="font-semibold">Log Output</h2>
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

      {/* <LiveLogViewer logFile={job.logFile} autoScroll={autoScroll} /> */}
    </div>
  );
}
