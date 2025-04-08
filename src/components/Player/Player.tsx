'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface PlayerProps {
  url: string;
  autoPlay?: boolean;
}

export default function Player({ url, autoPlay = true }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);

      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, some mobile)
      video.src = url;
    }
  }, [url]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        className="w-full h-auto rounded-lg shadow-lg bg-black"
      />
    </div>
  );
}
