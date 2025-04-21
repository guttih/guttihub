'use client';

import { useEffect, useRef, useState } from 'react';
import { StreamFormat } from '@/types/StreamFormat';
import { StreamingServiceResolver } from '@/utils/StreamingServiceResolver';
import { appConfig } from '@/config';

interface PlayerProps {
  url: string;
  autoPlay?: boolean;
}

function getFormat(url: string): StreamFormat | undefined {
    try {
      const parsed = new URL(url, window.location.origin);
      //This is my own streaming service that serves m3u8 playlist while recording
      if (parsed.pathname.indexOf('/hls-stream') > -1 && parsed.pathname.endsWith('/playlist')) {
        return StreamFormat.M3U8
      }
  
      const ext = parsed.pathname.split('.').pop()?.toLowerCase();
      return ext as StreamFormat | undefined;
    } catch (err) {
      console.warn("getFormat() failed:", err);
      return undefined;
    }
  }
  
  

import Hls from 'hls.js';

export function PlayerClient({ url, autoPlay = true }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const normalizedUrl = normalizeUrl(url);

  useEffect(() => {
    if (!normalizedUrl) return;
    const video = videoRef.current;
    if (!video) return;

    const format = getFormat(normalizedUrl);
    console.log("🧪 Format:", format, "URL:", normalizedUrl);

    const hlsx = new Hls();
    hlsx.on(Hls.Events.ERROR, (event, data) => {
        console.error("🔥 HLS.js ERROR:", data);
      });

    if (format === 'm3u8') {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(normalizedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (e, data) => {
          console.error("🔥 HLS.js error:", data);
          setUnsupported(true);
        });
        
        return () => hls.destroy();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = normalizedUrl;
      } else {
        setUnsupported(true);
      }
    } else {
      // Fallback for MP4 or other formats
      video.src = normalizedUrl;
    }
  }, [normalizedUrl]);

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
    <video
      ref={videoRef}
      controls
      autoPlay={autoPlay}
      className="fixed top-0 left-0 w-screen h-screen object-contain bg-black z-50"
    >
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

  const urlServiceValues = StreamingServiceResolver.splitStreamingSearchUrl(playUrl || '');
  if (!urlServiceValues) {
    console.error('PlayerClient::proxyUrl::normalizeUrl Invalid stream URL, missing vital parts.');
    return proxyUrl;
}

  const resolver = new StreamingServiceResolver();
  const service = resolver.findByServer(urlServiceValues.server);
  if (!service) {
    console.error('PlayerClient::proxyUrl::normalizeUrl Service not found for the provided URL.');
    return proxyUrl;
}
    console.log('PlayerClient::proxyUrl::normalizeUrl service:', service); // Debug line
    const unsanitizedUrl = StreamingServiceResolver.unsanitizeUrl(playUrl, service.username, service.password);
    const unsanitizedProxyUrl = makeStreamProxyUrl(unsanitizedUrl);
  return unsanitizedProxyUrl;
}
