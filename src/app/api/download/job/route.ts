// src/app/api/download/job/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { XreadJobFile } from "@/utils/job/XjobFileService";
import { DownloadJob } from "@/types/DownloadJob";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cacheKey = new URL(req.url).searchParams.get("cacheKey");
    if (!cacheKey) return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });

    try {
        const job = await XreadJobFile<DownloadJob>(cacheKey);
        return NextResponse.json(job);
    } catch (err) {
        console.warn("❌ Failed to load download job for", cacheKey, err);
        return NextResponse.json({ error: "Download job not found" }, { status: 404 });
    }
}
