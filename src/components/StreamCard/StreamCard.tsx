"use client";

import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { PlayerButton } from "@/components/PlayerButton/PlayerButton";

interface Props {
  entry: M3UEntry;
  showCopy?: boolean;
}

function getExtension(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const extMatch = path.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
    return extMatch ? extMatch[1] : null;
  } catch {
    return null;
  }
}

export function StreamCard({ entry, showCopy }: Props) {
  const extension = getExtension(entry.url);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy URL", err);
    }
  };

  return (
    <div className="relative bg-gray-900 text-white rounded-lg shadow-md overflow-hidden hover:bg-gray-800 transition duration-600 w-full max-w-xs">
      <div className="relative">
        <img
          src={entry.tvgLogo || "/fallback.png"}
          alt={`${entry.name} logo`}
          className="w-full h-48 object-contain bg-gray-950"
          title={`${M3UEntryFieldLabel.tvgLogo}='${entry.tvgLogo}'`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/fallback.png";
          }}
        />

        <div className="p-4">
          <h2
            className={`font-semibold truncate ${entry.name.length > 30 ? "text-sm" : "text-lg"}`}
            title={`${M3UEntryFieldLabel.name}='${entry.name}'`}
          >
            {entry.name}
          </h2>

          <p
            className="text-sm text-gray-400 truncate"
            title={`${M3UEntryFieldLabel.groupTitle}='${entry.groupTitle}'`}
          >
            {entry.groupTitle}
          </p>

          <PlayerButton streamUrl={entry.url} showUnsupported={true}  className="mt-2" />

          <div className="flex items-center justify-between mt-2">
            {extension && (
              <p className="text-xs text-gray-500">
                Format: <code>{extension}</code>
              </p>
            )}

            {showCopy && (<button
              onClick={handleCopy}
              className="text-xs text-blue-400 hover:text-blue-200 ml-2"
              title={`Copy to clipboard \nURL: ${entry.url}`}
            >
              📋 {copied && <span className="ml-1 text-green-400">Copied!</span>}
            </button>)}
          </div>

          {entry.tvgId && (
            <p
              className="text-xs text-gray-500 mt-1 text-right"
              title={`${M3UEntryFieldLabel.tvgId}='${entry.tvgId}'`}
            >
              {entry.tvgId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
