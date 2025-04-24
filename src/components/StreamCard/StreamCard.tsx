// src/components/StreamCard/StreamCard.tsx
import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { supportedFormats, getStreamFormatByExt, StreamFormat } from "@/types/StreamFormat";
import { getExtension } from "@/utils/ui/getExtension";
import { makeImageProxyUrl } from "@/utils/ui/makeImageProxyUrl";
import { hasRole, UserRole } from "@/types/UserRole";

interface Props {
    entry: M3UEntry;
    serviceId: string;
    userRole: UserRole;
    showCopy?: boolean;
    showPlayButton?: boolean;
    showRecordButton?: boolean;
    showStreamButton?: boolean;
    showDownloadButton?: boolean;
    showDeleteButton?: boolean;
    className?: string;
    onPlay?: (url: string) => void;
    onDelete?: (entry: M3UEntry) => void;
}

export function StreamCard({
    entry,
    serviceId,
    userRole,
    showCopy,
    showRecordButton = false,
    showStreamButton = false,
    showPlayButton = false,
    showDownloadButton = false,
    showDeleteButton = false,
    className = "",
    onPlay,
    onDelete,
}: Props) {
    const extension = getExtension(entry.url);
    const isRecordable = !extension;
    const supported = supportedFormats.map((format) => format.toLowerCase());
    const extensionIsSupported = extension ? supported.includes(extension.toLowerCase()) : false;
    const allowedToPlayMovies = showPlayButton && hasRole(userRole, "viewer");
    const allowedToStreamLive = showStreamButton && hasRole(userRole, "streamer");
    const allowedToRecordStream = showRecordButton && hasRole(userRole, "moderator");
    const allowedToDelete = showDeleteButton && hasRole(userRole, "admin");
    const format = getStreamFormatByExt(entry.url);
    const canLiveStream = format === StreamFormat.M3U8 || format === StreamFormat.UNKNOWN;
    // const isMovie = format === StreamFormat.MP4 || format === StreamFormat.MKV;
    const showPlay = !!onPlay && (extensionIsSupported || canLiveStream) && allowedToPlayMovies;

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

    const handleRecord = async () => {
        try {
            const res = await fetch("/api/cache-entry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            });

            if (!res.ok) {
                console.error("Failed to cache entry for recording");
                return;
            }

            const { cacheKey } = await res.json();
            window.open(`/record?cacheKey=${cacheKey}`, "_blank");
        } catch (err) {
            console.error("Error caching entry for recording:", err);
        }
    };

    const handlePlay = async () => {
        if (!onPlay) return;

        const format = getStreamFormatByExt(entry.url);
        const canLiveStream = format === StreamFormat.M3U8 || format === StreamFormat.UNKNOWN;

        if (canLiveStream) {
            try {
                const res = await fetch("/api/cache-entry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(entry),
                });

                if (!res.ok) throw new Error("Failed to cache entry");

                const { cacheKey } = await res.json();

                const startRes = await fetch("/api/live/start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cacheKey }),
                });

                if (!startRes.ok) throw new Error("Failed to start live stream");

                const { recordingId } = await startRes.json();
                const playlistUrl = `/api/hls-stream/${recordingId}/playlist`;

                onPlay(playlistUrl);
            } catch (err) {
                console.error("Live stream error:", err);
            }
        } else {
            onPlay(entry.url);
        }
    };

    return (
        <div
            className={`relative bg-gray-900 text-white rounded-lg shadow-md overflow-hidden hover:bg-gray-800 transition duration-300 w-full h-full ${className}`}
        >
            <div className="relative">
                <img
                    src={makeImageProxyUrl(entry.tvgLogo)}
                    alt={`${entry.name} logo`}
                    className="w-full h-48 object-contain bg-gray-950"
                    title={`${M3UEntryFieldLabel.tvgLogo}='${entry.tvgLogo}'`}
                    onError={(e) => ((e.target as HTMLImageElement).src = "/fallback.png")}
                />
                {/* Restore this icon */}
                {showPlay && (
                    <a
                        href={`/player?streamUrl=${entry.url}&serviceId=${serviceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-1 right-1 p-1 bg-gray-800/70 hover:bg-gray-600 rounded-sm z-20"
                        title="Open in new tab"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5Z" />
                        </svg>
                    </a>
                )}
            </div>

            <div className="p-6 pt-4 pb-16 space-y-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.open(`https://www.imdb.com/find?q=${encodeURIComponent(entry.name)}`, "_blank")}
                        title="Search on IMDb"
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700 p-1 rounded-full transition duration-200 ease-in-out transform hover:scale-110"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M10.5 3a7.5 7.5 0 0 1 6.32 11.495l4.092 4.091-1.414 1.415-4.091-4.092A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11z" />
                        </svg>
                    </button>
                    <h2
                        className={`font-semibold truncate ${entry.name.length > 30 ? "text-sm" : "text-lg"}`}
                        title={`${M3UEntryFieldLabel.name}='${entry.name}'`}
                    >
                        {entry.name}
                    </h2>
                </div>

                <p className="text-sm text-gray-400 truncate" title={`${M3UEntryFieldLabel.groupTitle}='${entry.groupTitle}'`}>
                    {entry.groupTitle}
                </p>

                {/* Grouped control buttons */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                    {showPlay && (
                        <button
                            onClick={handlePlay}
                            title="Play Now"
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-green-600 text-white hover:shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition-all duration-300"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                                />
                            </svg>
                        </button>
                    )}

                    {allowedToStreamLive && showStreamButton && (
                        <button
                            onClick={handlePlay}
                            title="Go Live"
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl ring-2 ring-blue-300 transition-all duration-300 text-2xl"
                        >
                            📡
                        </button>
                    )}

                    {isRecordable && allowedToRecordStream && (
                        <button
                            onClick={handleRecord}
                            title="Schedule Recording"
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md ring-2 ring-red-300 transition-all duration-300 text-xl"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                <path
                                    fillRule="evenodd"
                                    d="M3 3.75A.75.75 0 0 1 3.75 3h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 3.75zM4.5 6h15a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75v-12A.75.75 0 0 1 4.5 6zM12 9.75a.75.75 0 0 1 .75.75v3.19l1.22-1.22a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 1.06-1.06l1.22 1.22V10.5a.75.75 0 0 1 .75-.75z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}

                    {showDownloadButton && extensionIsSupported && (extension === "mp4" || extension === "mkv") && (
                        <button
                            onClick={() => window.open(entry.url, "_blank")}
                            title="Download Movie"
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-purple-600 text-white shadow-md ring-1 ring-white/20 backdrop-blur-sm transition-all duration-300 text-xl"
                        >
                            💾
                        </button>
                    )}
                    {allowedToDelete && (
                        <button
                            onClick={async () => {
                                const res = await fetch(new URL(entry.url).pathname, { method: "DELETE" });
                                if (res.ok) {
                                    onDelete?.(entry); // 🚀 This triggers the parent to remove it from the list
                                } else {
                                    const { error } = await res.json();
                                    alert(`Failed to delete: ${error}`);
                                }
                            }}
                            title="Delete Recording"
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-red-800 hover:bg-red-700 text-white shadow ring-2 ring-red-400 transition text-xl"
                        >
                            🗑️
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between mt-2">
                    {extension && (
                        <p className="text-xs text-gray-500">
                            Format: <code>{extension}</code>
                        </p>
                    )}
                    {showCopy && (
                        <button
                            onClick={handleCopy}
                            className="absolute top-[11.5rem] right-2 z-10 text-sm text-white bg-gray-700/70 hover:bg-gray-600 px-2 py-1 rounded-full backdrop-blur-sm transition duration-200"
                            title={`Copy to clipboard\nURL: ${entry.url}`}
                        >
                            {copied ? <span className="text-green-400 font-semibold">Copied!</span> : <span>📋</span>}
                        </button>
                    )}
                </div>

                {entry.tvgId && (
                    <p className="text-xs text-gray-500 mt-1 text-right" title={`${M3UEntryFieldLabel.tvgId}='${entry.tvgId}'`}>
                        {entry.tvgId}
                    </p>
                )}
            </div>
        </div>
    );
}
