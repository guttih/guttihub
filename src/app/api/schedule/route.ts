// src/app/api/schedule/route.ts
/*  
    GET      → list
    POST     → add
    DELETE   → delete
*/
import { NextRequest, NextResponse } from "next/server";
import { runJobctl } from "@/utils/jobctl";


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
