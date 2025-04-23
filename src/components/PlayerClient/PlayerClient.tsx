// src/components/PlayerClient/PlayerClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { appConfig } from "@/config";
import { detectStreamFormat, StreamFormat } from "@/types/StreamFormat";
import Hls from "hls.js";

interface PlayerProps {
  url: string;
  /** Optional: if omitted, we’ll derive it from the URL */
  serviceId?: string;
  autoPlay?: boolean;
}

export function PlayerClient({ url, serviceId, autoPlay = true }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const consumerId = useRef<string>(uuidv4());

  // Create resolver once
  const resolver = useMemo(() => new StreamingServiceResolver(), []);
  // Derive the real serviceId from prop or URL
  const resolvedServiceId =
    serviceId ?? resolver.findByViewingUrl(url)?.id;

  // 1️⃣ Normalize & proxy the URL if needed
  useEffect(() => {
    if (!url) return;
    try {
      const resolved = normalizeUrl(url);
      setNormalizedUrl(resolved);
    } catch (err) {
      console.error("PlayerClient: normalize URL failed", err);
      setUnsupported(true);
    }
  }, [url]);

  // 2️⃣ Attach HLS or set video src
  useEffect(() => {
    if (!normalizedUrl || !videoRef.current) return;

    const format = detectStreamFormat(normalizedUrl);
    const video = videoRef.current;

    if (format === StreamFormat.M3U8) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          console.error("HLS.js error:", data);
          if (data.fatal) {
            hls.destroy();
            setUnsupported(true);
          }
        });
        hls.loadSource(normalizedUrl);
        hls.attachMedia(video);
        return () => hls.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = normalizedUrl;
      } else {
        setUnsupported(true);
      }
    } else {
      video.src = normalizedUrl;
    }
  }, [normalizedUrl]);

  const hasRegistered = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !normalizedUrl || !resolvedServiceId) return;
  
    const fmt = detectStreamFormat(normalizedUrl);
    const isMovie = fmt === StreamFormat.MP4 || fmt === StreamFormat.MKV;
    if (!isMovie) return;
  
    const id = consumerId.current;
  
    const register = async () => {
      if (!hasRegistered.current) {
        hasRegistered.current = true;
        try {
          await fetch("/api/live/consumers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, serviceId: resolvedServiceId }),
          });
          console.debug(`[PlayerClient] Registered: ${id}`);
        } catch (err) {
          console.error("Register failed:", err);
        }
      }
    };
  
    const unregister = async () => {
      if (hasRegistered.current) {
        hasRegistered.current = false;
        try {
          await fetch("/api/live/consumers", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          console.debug(`[PlayerClient] Unregistered: ${id}`);
        } catch (err) {
          console.error("Unregister failed:", err);
        }
      }
    };
  
    const handlePlay = () => {
        console.debug("🔥 PLAY triggered!");
        register();
    }
    const handleStop = () =>{
        console.debug("🔥 STOP triggered!");
         unregister();
        }
  
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handleStop);
    video.addEventListener("ended", handleStop);
  
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handleStop);
      video.removeEventListener("ended", handleStop);
      unregister();
    };
  }, [normalizedUrl, resolvedServiceId]);
  
  useEffect(() => {
    const id = consumerId.current;
  
    const onBeforeUnload = () => {
      console.debug("🚪 beforeunload: unregistering", id);
  
      // This works in Chrome, Firefox, Safari with `keepalive`
      fetch("/api/live/consumers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        keepalive: true,
      }).catch((err) => {
        console.warn("❌ beforeunload DELETE failed:", err);
      });
    };
  
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
  

  if (unsupported) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500 mb-2">
          ⚠ This format is not supported in the browser.
        </p>
        <a href={normalizedUrl} download className="text-blue-500 underline">
          ⬇ Download Stream
        </a>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      autoPlay={autoPlay}
      className="fixed top-0 left-0 w-screen h-screen object-contain bg-black z-50"
      onError={() => setUnsupported(true)}
    >
      Your browser does not support video playback.
    </video>
  );
}

function shouldProxyUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    const mixed =
      window.location.protocol === "https:" && parsed.protocol === "http:";
    const cross = parsed.origin !== window.location.origin;
    return mixed || cross;
  } catch {
    return true;
  }
}

function makeStreamProxyUrl(originalUrl: string): string {
  return shouldProxyUrl(originalUrl)
    ? `/api/stream-proxy?url=${encodeURIComponent(originalUrl)}`
    : originalUrl;
}

function normalizeUrl(playUrl: string): string {
  const proxyUrl = makeStreamProxyUrl(playUrl);
  if (!appConfig.hideCredentialsInUrl) return proxyUrl;

  const vals = StreamingServiceResolver.splitStreamingSearchUrl(playUrl);
  if (!vals) {
    console.warn("PlayerClient::normalizeUrl missing service info");
    return proxyUrl;
  }

  const svc = new StreamingServiceResolver().findByServer(vals.server);
  if (!svc) {
    console.warn("PlayerClient::normalizeUrl service not found");
    return proxyUrl;
  }

  const unsanitized = StreamingServiceResolver.unsanitizeUrl(
    playUrl,
    svc.username,
    svc.password
  );
  return makeStreamProxyUrl(unsanitized);
}
