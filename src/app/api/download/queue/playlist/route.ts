import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasModeratorAccess } from "@/utils/auth/accessControl";
import { createQueuePlaylist } from "@/lib/downloads/playlist";

export const runtime = "nodejs";

export async function POST() {
    const session = await auth();
    if (!session?.user || !hasModeratorAccess(session.user)) {
        return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    }
    try {
        return NextResponse.json(await createQueuePlaylist());
    } catch {
        return NextResponse.json({ error: "Could not create playlist. Completed downloads and their final file metadata must still be available in the media directory." }, { status: 400 });
    }
}
