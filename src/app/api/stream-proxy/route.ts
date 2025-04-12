// File: src/app/api/stream-proxy/route.ts

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !url.startsWith("http")) {
    return new Response("Invalid or missing URL", { status: 400 });
  }

  try {
    // Forward Range header if present
    const rangeHeader = req.headers.get('range') || undefined;

    const upstreamResponse = await fetch(url, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
    });

    // Copy headers from upstream
    const headers = new Headers(upstreamResponse.headers);

    // Remove any headers that Next.js doesn't allow
    headers.delete('content-encoding');
    headers.delete('transfer-encoding');
    headers.set('Access-Control-Allow-Origin', '*'); // Optional: Useful for local testing

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (err) {
    console.error('❌ Stream proxy error:', err);
    return new Response('Proxy error', { status: 500 });
  }
}