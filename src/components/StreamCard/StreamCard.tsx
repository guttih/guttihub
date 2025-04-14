"use client";

import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { supportedFormats } from "@/types/StreamFormat";
import { getExtension } from "@/utils/ui/getExtension";
import { makeImageProxyUrl } from "@/utils/ui/makeImageProxyUrl";

interface Props {
  entry: M3UEntry;
  showCopy?: boolean;
  onPlay?: (url: string) => void;
  showUnsupported?: boolean;
  className?: string;
}

export function StreamCard({
  entry,
  showCopy,
  onPlay,
  showUnsupported,
  className = "",
}: Props) {
  const extension = getExtension(entry.url);
  const supported = supportedFormats.map((format) => format.toLowerCase());
  const extensionIsSupported = extension
    ? supported.includes(extension.toLowerCase())
    : false;
  const showPlay = onPlay && (showUnsupported || extensionIsSupported);

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
    <div
      className={`relative bg-gray-900 text-white rounded-lg shadow-md overflow-hidden hover:bg-gray-800 transition duration-300 w-full h-full ${className}`}
    >
      {/* Logo */}
      <div className="relative">
        <img
          src={makeImageProxyUrl(entry.tvgLogo)}
          alt={`${entry.name} logo`}
          className="w-full h-48 object-contain bg-gray-950"
          title={`${M3UEntryFieldLabel.tvgLogo}='${entry.tvgLogo}'`}
          onError={(e) =>
            ((e.target as HTMLImageElement).src = "/fallback.png")
          }
        />

        {/* Play in new tab button */}
        {showPlay && (
          <a
            href={`/player?streamUrl=${entry.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-0.5 right-0.5 p-0.5 bg-gray-800 bg-opacity-40 rounded-sm hover:bg-gray-500 z-20"
            title="Play in new tab"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 pointer-events-none"
            >
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5Z" />
            </svg>
          </a>
        )}
      </div>

      {/* Card content */}
      <div className="p-6 pt-4 space-y-2">
        {/* Title */}
        <h2
          className={`font-semibold truncate ${
            entry.name.length > 30 ? "text-sm" : "text-lg"
          }`}
          title={`${M3UEntryFieldLabel.name}='${entry.name}'`}
        >
          {entry.name}
        </h2>

        {/* Group */}
        <p
          className="text-sm text-gray-400 truncate"
          title={`${M3UEntryFieldLabel.groupTitle}='${entry.groupTitle}'`}
        >
          {entry.groupTitle}
        </p>

        {/* Play Button */}
        {showPlay && (
          <button
            onClick={() => onPlay(entry.url)}
            title="Play stream"
            className="absolute bottom-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-500 shadow-lg transition duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* Footer: Format + Copy */}
        <div className="flex items-center justify-between mt-2">
          {extension && (
            <p className="text-xs text-gray-500">
              Format: <code>{extension}</code>
            </p>
          )}

          {showCopy && (
            <button
              onClick={handleCopy}
              className="absolute bottom-0.5 right-0.5 text-ls text-blue-400 hover:bg-gray-600"
              title={`Copy to clipboard\nURL: ${entry.url}`}
            >
              📋 {copied && <span className="ml-2 text-green-400">Copied</span>}
            </button>
          )}
        </div>

        {/* TVG ID */}
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
  );
}
