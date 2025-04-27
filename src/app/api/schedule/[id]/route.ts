// src/app/api/schedule/[id]/route.ts
/*  
    GET      → by id
*/
import { NextRequest, NextResponse } from "next/server";
import { getJobByIdFromJobCtrl } from "@/utils/jobctl";
import { Job, JobctlResult } from "@/types/Jobctl";
import { jobctlToSystemScheduledJobMapper, SystemScheduledErrorResponse, SystemScheduledGetJobResponse } from "@/types/SystemScheduledJob";

/* ---------- get item -------------------------------------------------- */
export async function GET(req: NextRequest): Promise<NextResponse<SystemScheduledGetJobResponse | SystemScheduledErrorResponse>> {
    const { systemJobId } = (await req.json()) as { systemJobId?: string };

    if (!systemJobId) return makeErrorResponse("Missing systemJobId", 400);

    const result: JobctlResult = await getJobByIdFromJobCtrl(systemJobId);

    if (!result.ok) {
        return makeErrorResponse(`Job ${systemJobId} not found`, 404);
    }

    return makeSuccessResponse(result.job);
}


/* ---------- Helper functions ---------------------------------- */

const makeErrorResponse = (error: string, status: number = 500) => {
    const errorResult: SystemScheduledErrorResponse = {
        ok: false,
        error: error,
    };
    return NextResponse.json(errorResult, { status: status });
};

const makeSuccessResponse = (job: Job) => {
    const successResult: SystemScheduledGetJobResponse = {
        ok: true,
        job: jobctlToSystemScheduledJobMapper(job),
    };

    return NextResponse.json(successResult, { status: 200 });
};