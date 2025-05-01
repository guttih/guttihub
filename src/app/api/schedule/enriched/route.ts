// src/app/api/schedule/enriched/route.ts

import { NextResponse } from "next/server";
import { expandAllJobs, expandSingleJob } from "@/utils/JobctlMetaExpander";
import { ScheduledJobEnriched, SystemScheduledEnrichedUpdateJobResponse, SystemScheduledErrorResponse } from "@/types/ScheduledJob";
import { AllowedJobUpdateFields, EnrichedUpdatePayload } from "@/types/AllowedJobUpdateFields";
import { getJobByIdFromJobCtrl, runJobctl } from "@/utils/jobctl";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";
import { ScheduleRecordingParams } from "@/types/ScheduleRecordingParams";
import { M3UEntry } from "@/types/M3UEntry";
import { JobctlEnrichedScheduledJob } from "@/types/JobctlParsedMeta";

/* ---------- list enriched jobs ----------------------------------- */

export async function GET() {
    try {
        const enrichedJobs = await expandAllJobs();
        return NextResponse.json({ ok: true, enrichedJobs });
    } catch (err) {
        console.error("❌ Failed to expand jobs:", err);
        return NextResponse.json({ ok: false, enrichedJobs: [], error: "Failed to enrich scheduled jobs" }, { status: 500 });
    }
}

/* ---------- POST: Update a scheduled job ----------------------------------- */


export async function POST(req: Request): Promise<NextResponse<SystemScheduledEnrichedUpdateJobResponse | SystemScheduledErrorResponse>> {
    const body = (await req.json()) as EnrichedUpdatePayload;
    if (!body.systemJobId || !body.updatedFields || !areUpdateFieldsValid(body.updatedFields)) {
        return NextResponse.json({ ok: false, error: "Required fields, systemJobId and updatedFields, are missing or invalid" }, { status: 400 });
    }

    const getOldJobResponse = await getJobByIdFromJobCtrl(body.systemJobId);

    if (!getOldJobResponse?.ok) {
        return makeErrorResponse(`Job ${body.systemJobId} not found`, 404 );
    }

    const oldJobExpandedResults = await expandSingleJob(getOldJobResponse.job);

    if (!oldJobExpandedResults || !oldJobExpandedResults.entry) {
        return makeErrorResponse(`Unable to update job ${body.systemJobId}, cashe entry not found`, 404);
    }
    console.log(`🛠 Updating job ${body.systemJobId} with fields:`, body.updatedFields);

    const startTimeHasChanged = body.updatedFields.datetime !== oldJobExpandedResults.datetime;
    const timeHaveValuesChanged = startTimeHasChanged || body.updatedFields.duration !== oldJobExpandedResults.duration;
    
    const haveEntryValuesChanged = body.updatedFields.entryName !== oldJobExpandedResults.entry?.name;

    if (!timeHaveValuesChanged && !haveEntryValuesChanged) {
        return makeErrorResponse( "Unchanged fields, nothing to update!", 400 );
    }

    // We have changes people, Let's to to work

    const newEntryValues: M3UEntry = { 
        ...oldJobExpandedResults.entry, 
        name: body.updatedFields.entryName, 
    }
    
    if (!oldJobExpandedResults.outputFile) {
        await runJobctl("delete", body.systemJobId);
        return makeErrorResponse( `Old job was broken, removed it ${body.systemJobId}`, 500 );
    }
    if (!startTimeHasChanged) {  
        
        // We have to delete the old job because it is on excatly the same time as the old one, 
        // todo: maybe we should just change the job saved on disk?  but.... hey.. not now
        // todo: We need a guard that the same djob will not overlap with any oter job if they are recording on the same channel
         await runJobctl("delete", body.systemJobId);
    }

    const directoryExtracted = oldJobExpandedResults.outputFile.split("/").slice(0, -1).join("/");

    const params: ScheduleRecordingParams = {
        cacheKey: body.cacheKey,
        startTime: body.updatedFields.datetime,
        durationSec:body.updatedFields.duration,
        user: oldJobExpandedResults.user ? oldJobExpandedResults.user : "unknown",
        recordNow: false,
        location: directoryExtracted,
        entry: newEntryValues,
    };
    
   
    const result = await ScheduleResolver.scheduleRecording(params);
    if (result.success && result.recordingId && result.job) {
        
        if (result.job) {
            // We have the job from at, so let's enrich it
            const jobEnriched: JobctlEnrichedScheduledJob = await expandSingleJob(result.job);
            // We need to send ScheduledJobEnriched to the client
            const scheduledEnrished: ScheduledJobEnriched = {
                systemJobId: jobEnriched.systemJobId,
                datetime: jobEnriched.datetime,
                description: jobEnriched.description,
                command: jobEnriched.command,
                duration: jobEnriched.duration? jobEnriched.duration : 0,
                user: jobEnriched.user ? jobEnriched.user : "unknown",
                cacheKey: jobEnriched.cacheKey ? jobEnriched.cacheKey : "",
                outputFile: jobEnriched.outputFile ? jobEnriched.outputFile : "",
                recordingType: jobEnriched.recordingType ? jobEnriched.recordingType : "unknown",
                format: jobEnriched.format ? jobEnriched.format : "unknown",
                entry: jobEnriched.entry ? jobEnriched.entry : undefined
            };
        
            if (!startTimeHasChanged ) {
                // Now we can delete the old job, we did not have to do that abovbe because of same time issue os it's safer to delete here
                await runJobctl("delete", body.systemJobId);  // What shoud we return if delete failed?  //we still were albe to create the new job
            }
            // We need to send the enriched job to the client
            return makeSuccessResponse(scheduledEnrished);

        
    }

        return NextResponse.json({ ok: false, error: "Failed to enrich job" }, { status: 500 });
    }


    


    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
}

function areUpdateFieldsValid(updateFields: AllowedJobUpdateFields): boolean {
    const validFields = ["datetime", "duration", "entryName"];
    return Object.keys(updateFields).every((field) => validFields.includes(field));
}

const makeErrorResponse = (error: string, status: number = 500) => {
    const errorResult: SystemScheduledErrorResponse = {
        ok: false,
        error: error
    };
    return NextResponse.json(errorResult, { status: status });
};

const makeSuccessResponse = (scheduledEnrished: ScheduledJobEnriched) => {
    const successResult: SystemScheduledEnrichedUpdateJobResponse = {
        ok: true,
        jobEnriched: scheduledEnrished,
    };
    return NextResponse.json(successResult, { status: 200 });
};


