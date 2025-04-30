// src/components/StreamCard/StreamCard.tsx
import { useState } from "react";
import { M3UEntry } from "@/types/M3UEntry";
import { M3UEntryFieldLabel } from "@/types/M3UEntryFieldLabel";
import { supportedFormats, getStreamFormatByExt, StreamFormat } from "@/types/StreamFormat";
import { getExtension } from "@/utils/ui/getExtension";
import { makeImageProxyUrl } from "@/utils/ui/makeImageProxyUrl";
import { hasRole, UserRole } from "@/types/UserRole";
import { showMessageBox } from "@/components/ui/MessageBox";
import {
    MediaStreamButton,
    MediaPlayButton,
    MediaDownloadButton,
    MediaRecordButton,
    MediaDeleteButton
  } from "@/components/ui/MediaButtons";
  
  

interface Props {
    userName?: string;
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
    userName,
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
    const allowedToDelete = showDeleteButton && showPlayButton && hasRole(userRole, "admin");
    const allowedToDownload = showDownloadButton && hasRole(userRole, "moderator");
    const format = getStreamFormatByExt(entry.url);
    const canLiveStream = format === StreamFormat.M3U8 || format === StreamFormat.UNKNOWN;
    // const isMovie = format === StreamFormat.MP4 || format === StreamFormat.MKV;
    const showPlay = !!onPlay && (extensionIsSupported || canLiveStream) && allowedToPlayMovies;

    const [isStartingStreaming, setIsStartingStreaming] = useState(false);
    const [isStartingdownloading, setIsStartingDownloading] = useState(false);
    const [isStartingRecording, setIsStartingRecording] = useState(false);
    const [isStartingPlaying, setIsStartingPlaying] = useState(false);
    const [isStartingDelete, setIsStartingDelete] = useState(false);
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
            console.log("Posting to /api/cache");
            setIsStartingRecording(true);
            const res = await fetch("/api/cache", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            });

            if (!res.ok) {
                console.error("Failed to cache entry for recording");
                setIsStartingRecording(false);
                return;
            }

            const { cacheKey } = await res.json();
            window.open(`/record?cacheKey=${cacheKey}`, "_blank");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            setIsStartingRecording(false);
        } catch (err) {
            console.error("Error caching entry for recording:", err);
            setIsStartingRecording(false);
        }
    };

    const handlePlay = async () => {
        if (!onPlay) return;

        const format = getStreamFormatByExt(entry.url);
        const canLiveStream = format === StreamFormat.M3U8 || format === StreamFormat.UNKNOWN;

        if (canLiveStream) {
            try {
                setIsStartingStreaming(true);
                const res = await fetch("/api/cache", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(entry),
                });

                if (!res.ok) {
                    throw new Error("Failed to cache entry");
                }

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
                await new Promise((resolve) => setTimeout(resolve, 10000));
                setIsStartingStreaming(false);
            } catch (err) {
                setIsStartingStreaming(false);
                console.error("Live stream error:", err);
            }
        } else {
            setIsStartingPlaying(true);
            onPlay(entry.url);
            setIsStartingPlaying(false);
        }
    };

    const handleDownload = async () => {
        try {
            setIsStartingDownloading(true);
    
            const res = await fetch("/api/cache", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry),
            });
    
            if (!res.ok) {
                throw new Error("Failed to cache entry");
            }
    
            const { cacheKey } = await res.json();  // ✅ first res.json()
    
            const startRes = await fetch("/api/download/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cacheKey, entry, user: userName }),
            });
    
            if (!startRes.ok) {
                console.error("Failed to start download");
                setIsStartingDownloading(false);
                return;
            }
    
            const { recordingId } = await startRes.json();  // 🛠 Correct: startRes.json() not res.json()!
    
            console.log("✅ Started download job:", recordingId);
        } catch (err) {
            console.error("❌ Error starting download:", err);
        } finally {
            setIsStartingDownloading(false);  // 🛠 You had `setIsStartingRecording(false)` typo before
        }
    };

    const handleDelete = async () => {
        setIsStartingDelete(true); // Disable button immediately
        try {
            const res = await fetch(new URL(entry.url).pathname, { method: "DELETE" });
            if (res.ok) {
                onDelete?.(entry);
            } else {
                const { error } = await res.json();
                showMessageBox({ variant: "error", title: "Error", message: error || "Failed to delete entry" });
            }
        } catch (err) {
            console.error("Delete failed:", err);
            showMessageBox({ variant: "error", title: "Error", message: "Something went wrong while deleting." });
        } finally {
            setIsStartingDelete(false); // Re-enable button
        }
    }
    

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
                        <MediaPlayButton onClick={handlePlay} disabled={isStartingPlaying} title="Play Now" />
                    )}
                    {allowedToStreamLive && showStreamButton && (
                        <MediaStreamButton onClick={handlePlay} disabled={isStartingStreaming} title="Watch, and start streaming" />
                    )}

                    {isRecordable && allowedToRecordStream && (
                        <MediaRecordButton onClick={handleRecord} disabled={isStartingRecording} title="Watch, and start streaming" />
                    )}
                    {allowedToDownload && extensionIsSupported && (extension === "mp4" || extension === "mkv") && (
                        <MediaDownloadButton onClick={handleDownload} disabled={isStartingdownloading} title="Download to disk" />
                    )}

                    {allowedToDelete && (
                        <MediaDeleteButton onClick={handleDelete} disabled={isStartingDelete} title="Delete file from disk" />
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
