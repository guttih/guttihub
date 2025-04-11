// components/StreamCardInteractive/StreamCardInteractive.tsx
import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { InlinePlayer } from "@/components/InlinePlayer/InlinePlayer";

type Props = {
  entry: M3UEntry;
};

export default function StreamCardInteractive({ entry }: Props) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="border rounded p-4 shadow bg-gray-900">
      <div className="flex justify-between items-center">
        <div className="text-white font-semibold">{entry.name}</div>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="text-sm bg-blue-600 px-3 py-1 rounded"
        >
          {playing ? "Hide Player" : "Play"}
        </button>
      </div>

      {playing && (
        <div className="mt-3">
          <InlinePlayer url={entry.url} />
        </div>
      )}
    </div>
  );
}
