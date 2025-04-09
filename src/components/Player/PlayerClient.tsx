'use client';

import { useEffect, useRef, useState } from 'react';
import { StreamFormat, supportedFormats } from '@/types/StreamFormat';

interface PlayerProps {
  url: string;
  autoPlay?: boolean;
}

function getFormat(url: string): StreamFormat | undefined {
  const ext = url.split('.').pop()?.toLowerCase();
  return ext as StreamFormat | undefined;
}

export function PlayerClient({ url, autoPlay = true }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    if (!url) return;

    const format = getFormat(url);
    const video = videoRef.current;

    console.log('🔄 Player mounted with URL:', url, 'Format:', format);

    if (!format || !supportedFormats.includes(format)) {
      console.warn('❌ Unsupported format:', format);
      setUnsupported(true);
      return;
    }

    // M3U8 needs HLS.js
    if (format === StreamFormat.M3U8 && video) {
      import('hls.js').then(HlsModule => {
        const Hls = HlsModule.default;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(video);
        } else {
          console.warn('HLS.js not supported');
          setUnsupported(true);
        }
      });
    } else if (video) {
      video.load();
    }

    video.onerror = () => {
      console.error('❌ VIDEO ERROR:', video?.error);
    };

    video.onloadeddata = () => {
      console.log('✅ VIDEO LOADED');
    };
  }, [url]);

  if (unsupported) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500 mb-2">⚠ This format is not supported in the browser.</p>
        <a
          href={url}
          download
          className="text-blue-500 underline"
        >
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
      className="w-full h-auto rounded-lg shadow-lg bg-black"
    >
      <source src={url} />
      Your browser does not support video playback.
    </video>
  );
}
