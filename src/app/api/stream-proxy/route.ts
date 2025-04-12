// File: src/app/api/stream-proxy/route.ts

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !url.startsWith("http://")) {
    return new Response("Invalid or missing URL", { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        // Optionally forward user agent or auth headers
        "User-Agent": req.headers.get("user-agent") || "",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("Upstream error", { status: upstream.status });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
} catch (err) {
    console.error("Proxy error:", err);
  }
  
}
