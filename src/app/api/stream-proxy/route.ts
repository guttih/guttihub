// File: src/app/api/stream-proxy/route.ts

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url || !/^https?:\/\/[^ ]+$/.test(url)) {
        return new Response("Invalid or missing URL", { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s safeguard

    try {
        const rangeHeader = req.headers.get("range") || "bytes=0-";

        const upstreamResponse = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Range": rangeHeader,
                // Optional: You can pass Referer/Cookie if needed here
            },
            redirect: "follow",
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const headers = new Headers(upstreamResponse.headers);

        // Force proper content type if upstream is vague or wrong
        if (!headers.get("content-type") || headers.get("content-type") === "application/octet-stream") {
            headers.set("Content-Type", "video/mp2t");
        }

        // CORS for browser requests
        headers.set("Access-Control-Allow-Origin", "*");

        // Disable content-encoding so we forward raw stream
        headers.delete("content-encoding");
        headers.delete("transfer-encoding");
        headers.delete("content-length"); // let it stream dynamically

        // Disable caching
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.set("Pragma", "no-cache");

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            headers,
        });

    } catch (err) {
        clearTimeout(timeout);
        console.error("❌ Stream proxy error:", err);
        return new Response("Proxy error or stream blocked", { status: 502 });
    }
}
