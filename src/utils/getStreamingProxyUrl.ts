export function getStreamingProxyUrl(m3uUrl: string): string {
    return `/api/stream-proxy?url=` + encodeURIComponent(m3uUrl);
}
