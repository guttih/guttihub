// src/app/api/live/consumers/route.ts
import { NextResponse } from "next/server";
import { addMovieConsumer, removeMovieConsumer } from "@/utils/concurrency";

export async function POST(req: Request) {
    try {
        const { id, serviceId, entry } = await req.json();
        if (!id || !serviceId) {
            return NextResponse.json({ error: "Missing id or serviceId" }, { status: 400 });
        }
        await addMovieConsumer(id, serviceId, entry);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("❌ /api/live/consumers POST error:", err);
        return NextResponse.json({ error: "Failed to register consumer" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }
        await removeMovieConsumer(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("❌ /api/live/consumers DELETE error:", err);
        return NextResponse.json({ error: "Failed to unregister consumer" }, { status: 500 });
    }
}
