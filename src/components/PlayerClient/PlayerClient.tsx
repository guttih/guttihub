'use client';

import { useEffect, useRef, useState } from 'react';
import { StreamFormat, supportedFormats } from '@/types/StreamFormat';
import { StreamingServiceResolver } from '@/utils/StreamingServiceResolver';
import { appConfig } from '@/config';

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
  
    // Normalize stream URL once
    const normalizedUrl = normalizeUrl(url);
  
    useEffect(() => {
      if (!normalizedUrl) return;
  
      const format = getFormat(normalizedUrl);
      const video = videoRef.current;
      if (!video) return;
  
      console.log('🔄 Player mounted with URL:', normalizedUrl, 'Format:', format);
  
      if (!format || !supportedFormats.includes(format)) {
        console.warn('❌ Unsupported format:', format);
        setUnsupported(true);
        return;
      }
  
      video.load();
  
      video.onerror = () => {
        console.error('❌ VIDEO ERROR:', video?.error);
      };
  
      video.onloadeddata = () => {
        console.log('✅ VIDEO LOADED');
      };
    }, [normalizedUrl]);
  
    if (unsupported) {
      return (
        <div className="text-center p-4">
          <p className="text-red-500 mb-2">⚠ This format is not supported in the browser.</p>
          <a
            href={normalizedUrl}
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
        className="fixed top-0 left-0 w-screen h-screen object-contain bg-black z-50"
      >
        <source src={normalizedUrl} />
        Your browser does not support video playback.
      </video>
    );
  }
  

function makeStreamProxyUrl(imageUrl: string): string {
  const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(imageUrl)}`;
  return proxiedUrl;
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
