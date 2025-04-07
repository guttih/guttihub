'use client';

import { M3UEntry } from '@/types/M3UEntry';
import { M3UEntryFieldLabel } from '@/types/M3UEntryFieldLabel';

interface Props {
  entry: M3UEntry;
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

export default function ChannelCard({ entry }: Props) {
  const extension = getExtension(entry.url);

  return (
    <div className="relative bg-gray-900 text-white rounded-lg shadow-md overflow-hidden hover:bg-gray-800 transition duration-600 w-full max-w-xs">
      {/* Image area with play button */}
      <div className="relative">
        <img
          src={entry.tvgLogo || '/fallback.png'}
          alt={`${entry.name} logo`}
          className="w-full h-48 object-contain bg-gray-950"
          title={M3UEntryFieldLabel.tvgLogo}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/fallback.png';
          }}
        />
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition"
          title="Play stream"
        >
          ▶
        </a>
      </div>

      {/* Metadata */}
      <div className="p-4">
        <h2
          className="text-lg font-semibold truncate"
          title={M3UEntryFieldLabel.name}
        >
          {entry.name}
        </h2>

        <p
          className="text-sm text-gray-400 truncate"
          title={M3UEntryFieldLabel.groupTitle}
        >
          {entry.groupTitle}
        </p>

        {extension && (
          <p
            className="text-xs text-gray-500 mt-1"
            title={M3UEntryFieldLabel.url}
          >
            Format: <code>{extension}</code>
          </p>
        )}
      </div>
    </div>
  );
}
