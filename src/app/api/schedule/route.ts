// src/app/api/schedule/route.ts
/*  
    GET      → list
    POST     → add
    DELETE   → delete
*/
import { NextRequest, NextResponse } from "next/server";
import { runJobctl } from "@/utils/jobctl";
import { SystemScheduledJob } from "@/types/SystemScheduledJob";
import { Job, JobctlResult } from "@/types/Jobctl";
import { jobctlToSystemScheduledJobMapper } from "@/types/SystemScheduledJob";

/* ---------- list -------------------------------------------------- */
export async function GET() {
    const result: JobctlResult = await runJobctl("list");
  
    if (!result.ok || !("jobs" in result)) {
      return NextResponse.json({ ok: false, jobs: [] }, { status: 500 });
    }
  
    const systemJobs: SystemScheduledJob[] = result.jobs.map((job: Job) => {
      return jobctlToSystemScheduledJobMapper(job)
    });
  
    return NextResponse.json({ ok: true, systemJobs });
  }


/* ---------- add --------------------------------------------------- */
export async function POST(req: NextRequest) {
    const { datetime, description, command } = (await req.json()) as {
        datetime?: string;
        description?: string;
        command?: string;
    };
    
    if (!datetime || !description || !command) return NextResponse.json({ ok: false, error: "Missing field" }, { status: 400 });

    const json = await runJobctl("add", datetime, description, command);
    return NextResponse.json(json, { status: json.ok ? 201 : 500 });
}

/* ---------- delete ------------------------------------------------ */
export async function DELETE(req: NextRequest) {
    const { systemJobId } = (await req.json()) as { systemJobId?: string };
    if (!systemJobId) return NextResponse.json({ ok: false, error: "Missing systemJobId" }, { status: 400 });

    const json = await runJobctl("delete", systemJobId);
    return NextResponse.json(json, { status: json.ok ? 200 : 500 });
}
