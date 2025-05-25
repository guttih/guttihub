// src/app/api/system/cleanup/route.ts

import { NextResponse } from "next/server";
import { cleanupFinishedJobs } from "@/utils/resolverUtils";
import { hasUserAccessLevelServerOnly } from "@/utils/serverOnly/hasUserAccessLevel";
import { XdeleteOldDanglingJobs } from "@/utils/job/XcleanupHelpers";

export async function POST(req: Request) {
    try {
        const { force } = await req.json().catch(() => ({}));

        if (force && !(await hasUserAccessLevelServerOnly("admin"))) {
            return NextResponse.json({ success: false, error: "You are not allowed to force cleanup." }, { status: 403 });
        }
        const validForce = !!force;
        await cleanupFinishedJobs({ force: validForce });
        await XdeleteOldDanglingJobs(validForce);
        return NextResponse.json({ success: true, message: `Cleanup complete${force ? " (forced)" : ""}.` });
    } catch (err) {
        console.error("🧨 Cleanup failed:", err);
        return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
    }
}
