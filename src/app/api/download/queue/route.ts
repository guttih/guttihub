import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasModeratorAccess } from "@/utils/auth/accessControl";
import { addToQueue, changeQueue, getQueue, startDownloadQueueWorker } from "@/lib/downloads/queue";
import type { QueueAction } from "@/types/DownloadQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function allowed() {
    const session = await auth();
    return session?.user && hasModeratorAccess(session.user) ? session.user : null;
}
export async function GET() {
    if (!await allowed()) return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    startDownloadQueueWorker();
    try { return NextResponse.json(await getQueue()); }
    catch { return NextResponse.json({ error: "Unable to read download queue" }, { status: 500 }); }
}
export async function POST(req: Request) {
    const user = await allowed();
    if (!user) return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    try {
        const body = await req.json();
        if (body.action === "add") {
            const entry = body.entry;
            if (!entry || typeof body.serviceId !== "string" || ["url", "name", "tvgId", "tvgName", "tvgLogo", "groupTitle"].some((key) => typeof entry[key] !== "string")) {
                return NextResponse.json({ error: "Invalid media entry" }, { status: 400 });
            }
            await addToQueue({ name: entry.name, url: entry.url, tvgId: entry.tvgId, tvgName: entry.tvgName, tvgLogo: entry.tvgLogo, groupTitle: entry.groupTitle }, body.serviceId, user.name ?? user.id ?? "unknown");
        } else {
            if (!["start", "pause", "remove", "retry", "cancel", "moveUp", "moveDown"].includes(body.action)) return NextResponse.json({ error: "Invalid queue action" }, { status: 400 });
            await changeQueue(body.action as QueueAction, body.id);
        }
        startDownloadQueueWorker();
        return NextResponse.json(await getQueue());
    } catch {
        return NextResponse.json({ error: "Unable to update queue. Check the item and try again." }, { status: 400 });
    }
}
