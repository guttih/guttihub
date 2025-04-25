// src/components/cards/EnrichedScheduledJobCard/EnrichedScheduledJobCard.tsx

import { useState } from "react";
import { Card } from "@/components/ui/Card/Card";
import { BaseButton } from "@/components/ui/BaseButton/BaseButton";
import { JobctlEnrichedScheduledJob } from "@/types/JobctlEnrichedScheduledJob";
import { formatDuration } from "@/utils/ui/formatDuration";

interface Props {
  job: JobctlEnrichedScheduledJob;
  onDelete?: (id: string) => void;
}

export function EnrichedScheduledJobCard({ job, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { systemJobId, datetime, duration, cacheKey, outputFile, entry } = job;

  return (
    <Card className="w-full p-4 space-y-2">
     <div className="flex justify-between items-start w-full">
  {/* Left: Title + Time Info */}
  <div className="flex-1 min-w-0">
    <h2 className="text-lg font-semibold text-white truncate">
      {entry?.name || "Untitled Stream"}
    </h2>
    <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-4">
      <span>{new Date(datetime).toLocaleString(undefined, { hour12: false })}</span>
      <span>Ends {new Date(new Date(datetime).getTime() + duration * 1000).toLocaleTimeString(undefined, { hour12: false })}</span>
      <span>{formatDuration(duration)}</span>
    </div>
  </div>

  {/* Right: Logo + Buttons */}
  <div className="flex items-center gap-2">
  {entry?.tvgLogo && (
    <img
    src={entry.tvgLogo}
    alt="Logo"
    className="h-8 w-8 rounded-md object-contain shrink-0 mr-3"
  />
  )}
  {onDelete && (
    <BaseButton
      variant="danger"
      size="sm"
      onClick={() => onDelete(systemJobId)}
      className="text-sm"
    >
      ✕
    </BaseButton>
  )}
  <BaseButton
    variant="secondary"
    size="sm"
    onClick={() => setExpanded((prev) => !prev)}
  >
    {expanded ? "Less" : "More"}
  </BaseButton>
</div>

</div>



      {expanded && (
  <div className="text-sm text-gray-300 space-y-1 pt-2 border-t border-gray-700 mt-2">
    <p><strong>Description:</strong> {job.description || <em className="text-gray-500">No description</em>}</p>
    <p><strong>User:</strong> {job.user}</p>
    <p><strong>Cache Key:</strong> {job.cacheKey}</p>
    <p><strong>Output File:</strong> {job.outputFile}</p>
    <p><strong>Recording Type:</strong> {job.recordingType}</p>
    <p><strong>Format:</strong> {job.format}</p>
    <p><strong>Command:</strong> <code className="text-xs break-words">{job.command}</code></p>

    {entry && (
      <>
        <hr className="border-gray-700 my-2" />
        <p><strong>Stream Name:</strong> {entry.name}</p>
        <p><strong>TVG Name:</strong> {entry.tvgName}</p>
        <p><strong>TVG ID:</strong> {entry.tvgId}</p>
        <p><strong>Group:</strong> {entry.groupTitle}</p>
        <p><strong>Logo:</strong> {entry.tvgLogo 
          ? <img src={entry.tvgLogo} alt="Logo" className="h-6 inline ml-2" />
          : <span className="text-gray-500">None</span>
        }</p>
        <p><strong>Stream URL:</strong> <a href={entry.url} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{entry.url}</a></p>
      </>
    )}
  </div>
)}


    </Card>
  );
}
