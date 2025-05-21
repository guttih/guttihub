// src/app/api/image-proxy/route.ts
import { NextRequest } from "next/server";
import http from "http";
import https from "https";
import { appConfig } from "@/config";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    const origin = req.nextUrl.origin;

    if (url === appConfig.fallbackImage) {
        return new Response("Fallback image", {
            status: 200,
            headers: { "Content-Type": "image/jpeg" },
        });
    }

    if (!url || !/^https?:\/\/[^ ]+$/.test(url)) {
        return Response.redirect(makeFallbackUrl(origin), 302);
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === "https:" ? https : http;

        return await new Promise<Response>((resolve) => {
            const imageReq = client.get(parsedUrl, { signal: controller.signal }, (imageRes) => {
                clearTimeout(timeout);

                if (imageRes.statusCode && imageRes.statusCode >= 400) {
                    resolve(Response.redirect(makeFallbackUrl(origin), 302));
                    return;
                }

                const contentType = imageRes.headers["content-type"] || "image/jpeg";
                const headers = new Headers({ "Content-Type": contentType });

                const stream = new ReadableStream({
                    start(controller) {
                        imageRes.on("data", (chunk) => controller.enqueue(chunk));
                        imageRes.on("end", () => controller.close());
                        imageRes.on("error", () => {
                            resolve(Response.redirect(makeFallbackUrl(origin), 302));
                        });
                    },
                });

                resolve(new Response(stream, { headers }));
            });

            imageReq.on("error", () => {
                clearTimeout(timeout);
                resolve(Response.redirect(makeFallbackUrl(origin), 302));
            });
        });
    } catch {
        return Response.redirect(makeFallbackUrl(origin), 302);
    }
}

function makeFallbackUrl(origin: string): URL {
    return new URL(appConfig.fallbackImage, origin);
}
