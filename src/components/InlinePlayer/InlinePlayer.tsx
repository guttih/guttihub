"use client";

import React, { useRef, useEffect, useState } from "react";
import { appConfig } from "@/config";
import { v4 as uuidv4 } from "uuid";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { detectStreamFormat, StreamFormat } from "@/types/StreamFormat";

import Hls, { ErrorData } from "hls.js";

export interface InlinePlayerProps {
    url: string;
    movieTitle?:string
    /** Which service this playback belongs to */
    serviceId: string;
    autoPlay?: boolean;
    controls?: boolean;
    className?: string;
    showCloseButton?: boolean;
    onClose?: () => void;
    draggable?: boolean;
    top?: number;
    left?: number;
    width?: number;
    height?: number;
    onMove?: (pos: { x: number; y: number }) => void;
    onResize?: (size: { width: number; height: number }) => void;
    waitForPlaylist?: boolean;
}

export const InlinePlayer: React.FC<InlinePlayerProps> = ({
    url,
    serviceId,
    autoPlay = true,
    controls = true,
    className = "w-full aspect-video rounded shadow-md",
    showCloseButton = false,
    onClose,
    draggable = false,
    top,
    left,
    width,
    height,
    onMove,
    onResize,
    waitForPlaylist = false,
    movieTitle
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [canPlay, setCanPlay] = useState(false);
    const [finalUrl, setFinalUrl] = useState<string | null>(null);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const consumerId = useRef<string>(uuidv4());

    // 1️⃣ Wait for HLS playlist or jump straight to URL
    useEffect(() => {
        if (!url) return;

        const normalized = normalizeUrl(url);
        const tryLoadPlaylist = async () => {
            if (!waitForPlaylist) {
                setFinalUrl(normalized);
                return;
            }
            const maxTries = 16; // up to ~8s
            const delayMs = 500;
            for (let i = 0; i < maxTries; i++) {
                try {
                    const res = await fetch(normalized, { method: "HEAD" });
                    if (res.ok) {
                        setFinalUrl(normalized);
                        return;
                    }
                } catch {
                    // ignore
                }
                await new Promise((r) => setTimeout(r, delayMs));
            }
            console.error("[InlinePlayer] Timed out waiting for playlist");
        };

        setCanPlay(false);
        setFinalUrl(null);
        tryLoadPlaylist();
    }, [url, waitForPlaylist]);

    // 2️⃣ Attach HLS.js or set video.src
    useEffect(() => {
        if (!finalUrl || !videoRef.current) return;

        const video = videoRef.current;
        const format = detectStreamFormat(finalUrl);

        if (format === StreamFormat.M3U8) {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.attachMedia(video);
                hls.loadSource(finalUrl);
                hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
                    console.error("HLS.js error:", data);
                    if (data.fatal) hls.destroy();
                });
                return () => hls.destroy();
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = finalUrl;
            } else {
                console.warn("No HLS support in browser");
            }
        } else {
            // MP4, MKV, etc.
            video.src = finalUrl;
        }
    }, [finalUrl]);

    // 3️⃣ Register/unregister only for unshared streams
useEffect(() => {
    const video = videoRef.current;
    if (!video || !finalUrl || !serviceId) return;

    const isUnshared = finalUrl.includes("/stream-proxy") || isRawServiceUrl(finalUrl);
    let registered = false;

    const register = async () => {
        if (!registered) {
            registered = true;
            try {
                await fetch("/api/live/consumers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: consumerId.current, serviceId }),
                });
            } catch (err) {
                console.error("Failed to register InlinePlayer:", err);
            }
        }
    };

    const unregister = async () => {
        if (registered) {
            registered = false;
            try {
                await fetch("/api/live/consumers", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: consumerId.current }),
                });
            } catch (err) {
                console.error("Failed to unregister InlinePlayer:", err);
            }
        }
    };

    if (!isUnshared) return; // skip everything if stream is shared

    const handlePlay = () => register();
    const handleStop = () => unregister();

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handleStop);
    video.addEventListener("ended", handleStop);

    return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handleStop);
        video.removeEventListener("ended", handleStop);
        unregister(); // final cleanup
    };
}, [finalUrl, serviceId]);


    // Drag & resize handlers (unchanged)
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onMove) return;
        isDragging.current = true;
        offset.current = { x: e.clientX - (left ?? 0), y: e.clientY - (top ?? 0) };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current && onMove) {
            onMove({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
        }
    };
    const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };
    const handleResizeStart = (e: React.MouseEvent) => {
        if (!onResize) return;
        e.preventDefault();
        const startX = e.clientX,
            startY = e.clientY;
        const startW = width ?? 320,
            startH = height ?? 180;
        const onMoveResize = (ev: MouseEvent) => onResize({ width: startW + ev.clientX - startX, height: startH + ev.clientY - startY });
        window.addEventListener("mousemove", onMoveResize);
        window.addEventListener("mouseup", () => {
            window.removeEventListener("mousemove", onMoveResize);
        });
    };

    return (
        <div
            className={`relative ${className}`}
            style={{
                top,
                left,
                width,
                height,
                position: draggable ? "fixed" : undefined,
                zIndex: draggable ? 50 : undefined,
            }}
        >
            {draggable && (
                <div
                    onMouseDown={handleMouseDown}
                    className="absolute top-0 left-0 w-full h-6 cursor-move bg-black bg-opacity-30 z-30"
                    title="Drag player"
                />
            )}

            {!canPlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm z-10">
                    Loading stream...
                </div>
            )}

            {showCloseButton && onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-2 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20"
                    title="Close player"
                >
                    ✕
                </button>
            )}

            {finalUrl && (
                <video
                    ref={videoRef}
                    controls={controls}
                    autoPlay={autoPlay}
                    className="w-full h-full object-contain"
                    playsInline
                    onCanPlay={() => setCanPlay(true)}
                    onEnded={onClose}
                />
            )}

{finalUrl && (
    <div className="absolute top-1 left-1 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded z-40">
        mode: {finalUrl.includes("/stream-proxy") || isRawServiceUrl(finalUrl) ? "unshared" : "shared"}
        {movieTitle && <span className="ml-2">{` - ${movieTitle}`}</span>}
    </div>
)}


            {draggable && onResize && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-4 h-4 bg-gray-900 cursor-se-resize z-40"
                    title="Resize player"
                >
                    <svg
                        className="w-4 h-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="21 15 15 21" />
                        <polyline points="17 21 21 21 21 17" />
                    </svg>
                </div>
            )}
        </div>
    );
};

function isRawServiceUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return !u.host.includes("localhost") &&
               !u.pathname.startsWith("/hls-stream") &&
               !u.pathname.startsWith("/recordings");
    } catch {
        return false;
    }
}


function makeStreamProxyUrl(playUrl: string): string {
    if (playUrl.includes("/hls-stream") && playUrl.endsWith("/playlist")) {
        return playUrl;
    }
    return `/api/stream-proxy?url=${encodeURIComponent(playUrl)}`;
}

function normalizeUrl(playUrl: string): string {
    if (!appConfig.hideCredentialsInUrl) {
        return makeStreamProxyUrl(playUrl);
    }
    const urlValues = StreamingServiceResolver.splitStreamingSearchUrl(playUrl);
    if (!urlValues) return playUrl;
    const service = new StreamingServiceResolver().findByServer(urlValues.server);
    return service ? StreamingServiceResolver.unsanitizeUrl(playUrl, service.username, service.password) : makeStreamProxyUrl(playUrl);
}
