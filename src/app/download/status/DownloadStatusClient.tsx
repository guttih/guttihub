"use client";

import { useState } from "react";
import { DownloadJob } from "@/types/DownloadJob";
import DownloadMonitor from "@/components/DownloadMonitor/DownloadMonitor";

interface Props {
  job: DownloadJob;
}

export default function DownloadStatusClient({ job }: Props) {
  const [status] = useState<string>("loading");

  function extractDirAndFileName(outputFile: string) {
    const i = outputFile.indexOf("/videos/");
    return i !== -1 ? outputFile.substring(i + 8) : outputFile;
  }

  function extractFileName(outputFile: string): string {
    const parts = outputFile.split("/");
    return parts[parts.length - 1];
  }

  return (
    <div className="p-6 text-sm text-gray-300 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Download</h1>
      </div>

      <div className="space-y-1 text-xs text-gray-400 border border-gray-700 rounded p-3 bg-gray-900">
        {job.outputFile && (
          <div className="mt-2">
            <strong>Download:</strong>{" "}
            <a
              href={`/player?streamUrl=/api/video/${extractDirAndFileName(job.outputFile)}`}
              className="text-blue-400 underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {extractFileName(job.outputFile)}
            </a>
          </div>
        )}
      </div>

      <DownloadMonitor cacheKey={job.cacheKey} />

      {status === "done" && (
        <div className="mt-6 text-green-400 bg-green-900 border border-green-700 rounded p-3 text-sm">
          ✅ Download complete! You may close this tab or open the file above.
        </div>
      )}
    </div>
  );
}
