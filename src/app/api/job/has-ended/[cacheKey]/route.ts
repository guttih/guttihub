// src/app/api/job/has-ended/[cacheKey]/route.ts

// Correcting the second argument to the handler function to match the expected type for Next.js.

import { NextRequest, NextResponse } from "next/server";
import { cleanupFinishedJobs } from "@/utils/resolverUtils";

// Corrected POST function signature with dynamic params
export async function POST(req: NextRequest) {
    try {
        const { cacheKey } = await req.json();

        // TODO: should we do more surgical cleanup, just for this job?
        await cleanupFinishedJobs();

        return NextResponse.json({
            success: true,
            message: `Cleanup for job ${cacheKey} complete.`,
        });
    } catch (err) {
        console.error("🧨 Targeted cleanup failed:", err);
        return NextResponse.json({ success: false, error: "Targeted cleanup failed" }, { status: 500 });
    }
}
