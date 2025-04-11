// components/InlinePlayer/InlinePlayer.tsx

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
}

export const InlinePlayer: React.FC<InlinePlayerProps> = ({
  url,
  autoPlay = true,
  controls = true,
  className = "w-full aspect-video rounded shadow-md",
  showCloseButton = false,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setCanPlay(true);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [url]);

  return (
    <div className={`relative ${className}`}>
      {!canPlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm z-10">
          Loading stream...
        </div>
      )}

      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center z-20"
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
    </div>
  );
};

function normalizeUrl(playUrl: string): string {
  if (!appConfig.hideCredentialsInUrl) {
    return playUrl;
  }

  const urlServiceValues = StreamingServiceResolver.splitStreamingSearchUrl(playUrl || "");
  if (!urlServiceValues) return playUrl;

  const resolver = new StreamingServiceResolver();
  const service = resolver.findByServer(urlServiceValues.server);
  if (!service) return playUrl;

  return StreamingServiceResolver.unsanitizeUrl(playUrl, service.username, service.password);
}
