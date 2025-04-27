// src/components/RecordingMonitor/StatusBadge.tsx
import React from "react";

export function StatusBadge({ status }: { status: string }) {
  function getBadgeStyle(status: string) {
    switch (status.toLowerCase()) {
      case "recording":
        return "bg-yellow-400 text-black animate-pulse";
      case "packaging":
        return "bg-blue-400 text-black animate-pulse";
      case "done":
        return "bg-green-600 text-white";
      case "error":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeStyle(
        status
      )}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
