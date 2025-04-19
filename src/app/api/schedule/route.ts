/*  /api/record/schedule
    GET      → list
    POST     → add
    DELETE   → delete
*/
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const JOBCTL = process.env.JOBCTL_PATH ?? "src/scripts/jobctl.sh"; // adjust if needed

async function runJobctl(...args: string[]) {
    try {
        const { stdout } = await exec(JOBCTL, args, { timeout: 60_000 });
        return JSON.parse(stdout.toString());
    } catch (err) {
        return { ok: false, error: (err as Error).message };
    }
}

/* ---------- list -------------------------------------------------- */
export async function GET() {
    const json = await runJobctl("list");
    return NextResponse.json(json, { status: json.ok ? 200 : 500 });
}

/* ---------- add --------------------------------------------------- */
export async function POST(req: NextRequest) {
    const { datetime, desc, cmd } = (await req.json()) as {
        datetime?: string;
        desc?: string;
        cmd?: string;
    };
    if (!datetime || !desc || !cmd) return NextResponse.json({ ok: false, error: "Missing field" }, { status: 400 });

    const json = await runJobctl("add", datetime, desc, cmd);
    return NextResponse.json(json, { status: json.ok ? 201 : 500 });
}

/* ---------- delete ------------------------------------------------ */
export async function DELETE(req: NextRequest) {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const json = await runJobctl("delete", id);
    return NextResponse.json(json, { status: json.ok ? 200 : 500 });
}
