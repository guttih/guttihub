'use client';

import { M3UEntry } from '@/types/M3UEntry';

interface Props {
  entry: M3UEntry;
}

export default function ChannelCard({ entry }: Props) {
  return (
    <div className="p-4 border rounded shadow-sm bg-white hover:bg-gray-100 transition">
      <div className="flex items-center space-x-4">
        {entry.tvgLogo && (
          <img
            src={entry.tvgLogo}
            alt={`${entry.name} logo`}
            className="h-12 w-12 object-contain rounded"
          />
        )}
        <div>
          <h2 className="text-lg font-semibold">{entry.name}</h2>
          <p className="text-sm text-gray-600">{entry.groupTitle}</p>
        </div>
      </div>

      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 text-sm mt-2 inline-block"
      >
        ▶ Play Stream
      </a>
    </div>
  );
}
