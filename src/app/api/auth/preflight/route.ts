// src/app/api/auth/preflight/route.ts
import { NextResponse } from "next/server";
import { preflightForUsername } from "@/lib/auth/decide";

export async function POST(req: Request) {
    try {
        const { username } = (await req.json()) as { username?: string };
        const result = await preflightForUsername(username ?? "");
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ code: null });
    }
}

