// src/app/api/job/has-ended/[cacheKey]/route.ts

// Correcting the second argument to the handler function to match the expected type for Next.js.

import { NextRequest, NextResponse } from "next/server";
import { cleanupFinishedJobs, finalizeJobStart } from "@/utils/resolverUtils";

// Corrected POST function signature with dynamic params
export async function POST(req: NextRequest) {
    try {
        const { cacheKey } = await req.json();
        console.log("🧨 Targeted cleanup for job:", cacheKey);
        // Finalize the job first (move file, create info.json, delete temp files)
        const jobFinalized = await finalizeJobStart(cacheKey);
        if (!jobFinalized) {
            return NextResponse.json({ success: false, error: "Job finalization failed" }, { status: 500 });
        }
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
