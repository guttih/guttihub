// src/app/api/stream-proxy/route.ts

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    const consumerId = req.nextUrl.searchParams.get("consumerId"); // 👈 new

    if (!url || !/^https?:\/\/[^ ]+$/.test(url)) {
        return new Response("Invalid or missing URL", { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s safeguard

    try {
        const rangeHeader = req.headers.get("range");

        const upstreamResponse = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
                Accept: "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                ...(rangeHeader ? { Range: rangeHeader } : {}),
            },
            redirect: "follow",
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const headers = new Headers(upstreamResponse.headers);
        const contentType = headers.get("content-type");
        if (!contentType) {
            if (url.endsWith(".m3u8")) {
                headers.set("Content-Type", "application/vnd.apple.mpegurl");
            } else if (url.endsWith(".ts")) {
                headers.set("Content-Type", "video/mp2t");
            }
        }

        headers.set("Access-Control-Allow-Origin", "*");
        headers.delete("content-encoding");
        headers.delete("transfer-encoding");

        if (rangeHeader) {
            headers.delete("content-length");
        }

        headers.set("Accept-Ranges", "bytes");
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
