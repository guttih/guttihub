// src/app/api/movie-consumers/on-player-close/route.ts

import { NextRequest } from "next/server";
import { removeMovieConsumer } from "@/utils/concurrency";
import { logger } from "@/utils/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.text(); // Because sendBeacon sends as text/plain
        const { id } = JSON.parse(body);
        if (!id) return new Response("Missing id", { status: 400 });

        await removeMovieConsumer(id);
        return new Response("OK");
    } catch (err) {
        logger.error("❌ Failed to unregister on tab close:", err);
        return new Response("Error", { status: 500 });
    }
}
