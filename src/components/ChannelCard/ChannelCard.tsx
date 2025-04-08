"use client";

import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import PlayerButton from "@/components/PlayerButton/PlayerButton";

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
                    src={entry.tvgLogo || "/fallback.png"}
                    alt={`${entry.name} logo`}
                    className="w-full h-48 object-contain bg-gray-950"
                    title={M3UEntryFieldLabel.tvgLogo}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/fallback.png";
                    }}
                />

            {/* Metadata */}
            <div className="p-4">
                <h2
                    className={`font-semibold truncate ${entry.name.length > 30 ? "text-sm" : "text-lg"}`}
                    title={`${M3UEntryFieldLabel.name}='${entry.name}'`}
                >
                    {entry.name}
                </h2>

                <p className="text-sm text-gray-400 truncate" title={`${M3UEntryFieldLabel.groupTitle}='${entry.groupTitle}'`}>
                    {entry.groupTitle}
                </p>
                <PlayerButton streamUrl={entry.url} className="mt-2" />
                <div>
                    {extension && (
                        <p className="text-xs text-gray-500 mt-1 text-left">
                            Format: <code>{extension}</code>
                        </p>
                    )}
                    {entry.tvgId && (
                        <p className="text-xs text-gray-500 mt-1 text-right" title={`${M3UEntryFieldLabel.tvgId}='${entry.tvgId}'`}>
                            {entry.tvgId}
                        </p>
                    )}
                </div>
            </div>
        </div>
    </div>
    );
    
}
