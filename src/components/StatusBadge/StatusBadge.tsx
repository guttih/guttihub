"use client";

export default function StatusBadge({ status }: { status: string }) {
    const base = "text-xs px-2 py-1 rounded font-semibold";
  
    if (status === "recording") {
      return (
        <span className={`${base} bg-yellow-500/20 text-yellow-300 animate-pulse`}>
          ⏳ Recording...
        </span>
      );
    }
  
    if (status === "done") {
      return (
        <span className={`${base} bg-green-600/20 text-green-400`}>
          ✅ Done
        </span>
      );
    }
  
    if (status === "error") {
      return (
        <span className={`${base} bg-red-500/20 text-red-400`}>
          ❌ Error
        </span>
      );
    }
  
    return (
      <span className={`${base} bg-gray-700 text-gray-300`}>
        {status}
      </span>
    );
  }
  