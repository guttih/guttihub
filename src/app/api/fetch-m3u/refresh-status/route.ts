import { NextRequest, NextResponse } from "next/server";
import { StreamingServiceResolver } from "@/resolvers/StreamingServiceResolver";
import { getCacheFilePath, fileExists } from "@/utils/fileHandler";

// GET /api/fetch-m3u/refresh-status?serviceId=...
export async function GET(req: NextRequest): Promise<NextResponse<{ refreshing: boolean; hasCache: boolean; lockPath?: string }>> {
    const serviceId = req.nextUrl.searchParams.get("serviceId");
    if (!serviceId) {
        return NextResponse.json({ refreshing: false, hasCache: false }, { status: 400 });
    }

    const resolver = new StreamingServiceResolver();
    const service = resolver.findById(serviceId);
    if (!service) {
        return NextResponse.json({ refreshing: false, hasCache: false }, { status: 404 });
    }

    const cachePath = getCacheFilePath(service.username, service.name, "cashedEntries");
    const lockPath = `${cachePath}.lock`;
    const [refreshing, hasCache] = await Promise.all([
        fileExists(lockPath).catch(() => false),
        fileExists(cachePath).catch(() => false),
    ]);
    return NextResponse.json({ refreshing, hasCache, lockPath });
}
