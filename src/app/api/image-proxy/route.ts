import { NextRequest } from "next/server";
import http from "http";
import https from "https";
import { appConfig } from "@/config";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url || !/^https?:\/\/[^ ]+$/.test(url)) {
        return new Response("Invalid 'url' parameter", { status: 400 });
    }

    if (url === appConfig.fallbackImage) {
        return new Response("Fallback image", { status: 200, headers: { "Content-Type": "image/jpeg" } });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000); // 7 sec

        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === "https:" ? https : http;

        return await new Promise<Response>((resolve, reject) => {
            const req = client.get(parsedUrl, { signal: controller.signal }, (imageRes) => {
                clearTimeout(timeout);

                if (imageRes.statusCode && imageRes.statusCode >= 400) {
                    resolve(new Response("Image fetch failed", { status: imageRes.statusCode }));
                    return;
                }

                const contentType = imageRes.headers["content-type"] || "image/jpeg";
                const headers = new Headers({ "Content-Type": contentType });

                const stream = new ReadableStream({
                    start(controller) {
                        imageRes.on("data", (chunk) => controller.enqueue(chunk));
                        imageRes.on("end", () => controller.close());
                        imageRes.on("error", (err) => reject(err));
                    },
                });

                resolve(new Response(stream, { headers }));
            });

            req.on("error", (err) => {
                clearTimeout(timeout);
                console.error("Proxy error:", err.message);
                reject(new Response("Image fetch error", { status: 500 }));
            });
        });
    } catch (err) {
        console.error("Invalid image URL:", err);
        return new Response("Invalid 'url' parameter", { status: 400 });
    }
}
