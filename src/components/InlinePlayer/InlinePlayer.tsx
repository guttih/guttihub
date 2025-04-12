"use client";

import React, { useRef, useEffect, useState } from "react";
import { appConfig } from "@/config";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";

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
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [canPlay, setCanPlay] = useState(false);
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleCanPlay = () => setCanPlay(true);
        video.addEventListener("canplay", handleCanPlay);

        return () => {
            video.removeEventListener("canplay", handleCanPlay);
        };
    }, [url]);

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
            const newWidth = startWidth + (ev.clientX - startX);
            const newHeight = startHeight + (ev.clientY - startY);
            onResize({ width: newWidth, height: newHeight });
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

            <video
                ref={videoRef}
                src={normalizeUrl(url)}
                controls={controls}
                autoPlay={autoPlay}
                className="w-full h-full object-contain"
                playsInline
            />

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
    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(imageUrl )}`;
  

    return proxiedUrl;
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
