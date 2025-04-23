"use client";

import { useEffect, useRef, useState } from "react";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import { appConfig } from "@/config";
import { detectStreamFormat } from "@/types/StreamFormat";
import Hls from "hls.js";

interface PlayerProps {
    url: string;
    autoPlay?: boolean;
}

export function PlayerClient({ url, autoPlay = true }: PlayerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [unsupported, setUnsupported] = useState(false);
    const [normalizedUrl, setNormalizedUrl] = useState("");

    useEffect(() => {
        if (!url) return;

        try {
            const resolved = normalizeUrl(url); // ✅ window-safe
            setNormalizedUrl(resolved);
        } catch (err) {
            console.error("Failed to normalize URL", err);
            setUnsupported(true);
        }
    }, [url]);

    useEffect(() => {
        if (!url || !videoRef.current) return;

        const format = detectStreamFormat(url);
        const video = videoRef.current;

        console.log("🧪 Format:", format, "URL:", url);

        if (format === "m3u8") {
            if (Hls.isSupported()) {
                const hls = new Hls();

                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error("🔥 HLS.js error:", data);
                    if (data.fatal) {
                        hls.destroy();
                        setUnsupported(true);
                    }
                });

                hls.loadSource(url);
                hls.attachMedia(video);

                return () => hls.destroy();
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = url;
            } else {
                setUnsupported(true);
            }
        } else {
            video.src = url;
        }
    }, [url]);

    if (unsupported) {
        return (
            <div className="text-center p-4">
                <p className="text-red-500 mb-2">⚠ This format is not supported in the browser.</p>
                <a href={normalizedUrl} download className="text-blue-500 underline">
                    ⬇ Download Stream
                </a>
            </div>
        );
    }

    return (
        <video ref={videoRef} controls autoPlay={autoPlay} className="fixed top-0 left-0 w-screen h-screen object-contain bg-black z-50">
            Your browser does not support video playback.
        </video>
    );
}

function shouldProxyUrl(url: string): boolean {
    const parsed = new URL(url, window.location.origin);
    const isMixedContent = window.location.protocol === "https:" && parsed.protocol === "http:";
    const isCrossOrigin = parsed.origin !== window.location.origin;
    return isMixedContent || isCrossOrigin;
}

function makeStreamProxyUrl(originalUrl: string): string {
    return shouldProxyUrl(originalUrl) ? `/api/stream-proxy?url=${encodeURIComponent(originalUrl)}` : originalUrl;
}

function normalizeUrl(playUrl: string): string {
    const proxyUrl = makeStreamProxyUrl(playUrl);
    if (!appConfig.hideCredentialsInUrl) {
        return proxyUrl;
    }

    const urlServiceValues = StreamingServiceResolver.splitStreamingSearchUrl(playUrl || "");
    if (!urlServiceValues) {
        console.error("PlayerClient::proxyUrl::normalizeUrl Invalid stream URL, missing vital parts.");
        return proxyUrl;
    }

    const resolver = new StreamingServiceResolver();
    const service = resolver.findByServer(urlServiceValues.server);
    if (!service) {
        console.error("PlayerClient::proxyUrl::normalizeUrl Service not found for the provided URL.");
        return proxyUrl;
    }
    console.log("PlayerClient::proxyUrl::normalizeUrl service:", service); // Debug line
    const unsanitizedUrl = StreamingServiceResolver.unsanitizeUrl(playUrl, service.username, service.password);
    const unsanitizedProxyUrl = makeStreamProxyUrl(unsanitizedUrl);
    return unsanitizedProxyUrl;
}
