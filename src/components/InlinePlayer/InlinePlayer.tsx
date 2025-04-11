// components/InlinePlayer/InlinePlayer.tsx

"use client";

import { appConfig } from "@/config";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import React, { useRef, useEffect, useState } from "react";

export interface InlinePlayerProps {
  url: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}

function normalizeUrl(playUrl: string): string {
  if (!appConfig.hideCredentialsInUrl) {
    return playUrl;
  }

    const urlServiceValues = StreamingServiceResolver.splitStreamingSearchUrl(playUrl || "");
    if (!urlServiceValues) {
      return playUrl;
    }
    const resolver = new StreamingServiceResolver();
    const service = resolver.findByServer(urlServiceValues.server);
    if (!service) {
      return playUrl;
    }
    return StreamingServiceResolver.unsanitizeUrl(playUrl, service.username, service.password);

}

export const InlinePlayer: React.FC<InlinePlayerProps> = ({
  url,
  autoPlay = true,
  controls = true,
  className = "w-full aspect-video rounded shadow-md",
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
