"use client";

import React, { useRef, useEffect, useState } from "react";
import { appConfig } from "@/config";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import { detectStreamFormat, StreamFormat } from "@/types/StreamFormat";

import Hls, { ErrorData } from "hls.js";

export interface InlinePlayerProps {
    url: string;
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
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [canPlay, setCanPlay] = useState(false);
    const [finalUrl, setFinalUrl] = useState<string | null>(null);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!url) return;

        const normalized = normalizeUrl(url);

        const tryLoadPlaylist = async () => {
            if (!waitForPlaylist) {
                setFinalUrl(normalized);
                return;
            }

            const maxTries = 16; // 8 seconds total
            const delayMs = 500;

            for (let i = 0; i < maxTries; i++) {
                try {
                    const res = await fetch(normalized, { method: "HEAD" });
                    if (res.ok) {
                        console.log(`[waitForPlaylist] Ready on attempt ${i + 1}`);
                        setFinalUrl(normalized);
                        return;
                    }
                } catch {
                    console.warn(`[waitForPlaylist] Attempt ${i + 1} failed`);
                }
                await new Promise((r) => setTimeout(r, delayMs));
            }

            console.error("[InlinePlayer] Timed out waiting for playlist");
        };

        setCanPlay(false);
        setFinalUrl(null);
        tryLoadPlaylist();
    }, [url, waitForPlaylist]);

    useEffect(() => {
        if (!finalUrl || !videoRef.current) return;

        const video = videoRef.current;
        const format = detectStreamFormat(finalUrl);

        if (format === StreamFormat.M3U8) {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.attachMedia(video);
                hls.loadSource(finalUrl);

                hls.on(Hls.Events.ERROR, (_e, data: ErrorData) => {
                    console.error("HLS.js error:", data);
                    if (data.fatal) {
                        hls.destroy();
                    }
                });

                return () => hls.destroy();
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = finalUrl;
            } else {
                console.warn("No HLS support.");
            }
        } else {
            video.src = finalUrl;
        }
    }, [finalUrl]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onMove) return;
        isDragging.current = true;
        offset.current = {
            x: e.clientX - (left ?? 0),
            y: e.clientY - (top ?? 0),
        };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !onMove) return;
        onMove({
            x: e.clientX - offset.current.x,
            y: e.clientY - offset.current.y,
        });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        if (!onResize) return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = width ?? 320;
        const startHeight = height ?? 180;

        const onMouseMove = (ev: MouseEvent) => {
            onResize({
                width: startWidth + (ev.clientX - startX),
                height: startHeight + (ev.clientY - startY),
            });
        };

        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
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
                />
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

function makeStreamProxyUrl(imageUrl: string): string {
    if (imageUrl.indexOf("/hls-stream") > -1 && imageUrl.endsWith("/playlist")) {
        return imageUrl;
    }
    return `/api/stream-proxy?url=${encodeURIComponent(imageUrl)}`;
}

function normalizeUrl(playUrl: string): string {
    if (!appConfig.hideCredentialsInUrl) {
        return makeStreamProxyUrl(playUrl);
    }

    const urlServiceValues = StreamingServiceResolver.splitStreamingSearchUrl(playUrl || "");
    if (!urlServiceValues) return playUrl;

    const resolver = new StreamingServiceResolver();
    const service = resolver.findByServer(urlServiceValues.server);
    if (!service) return makeStreamProxyUrl(playUrl);

    return StreamingServiceResolver.unsanitizeUrl(playUrl, service.username, service.password);
}
