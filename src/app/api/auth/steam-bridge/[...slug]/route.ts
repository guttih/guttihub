// src/app/api/auth/steam-bridge/[...slug]/route.ts
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug?: string[] }> }) {
    const { slug } = await ctx.params;
    const provider = slug?.[slug.length - 1] ?? "steam";

    const url = new URL(req.url);
    url.searchParams.set("code", "123");
    const dest = new URL(`/api/auth/callback/${provider}`, process.env.NEXTAUTH_URL);
    dest.search = url.searchParams.toString();
    return Response.redirect(dest.toString());
}

export async function POST() {
    return Response.json({ token: "123" });
}

