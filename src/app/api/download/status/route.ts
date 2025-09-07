// src/app/api/download/status/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDownloadJobInfo } from "@/utils/resolverUtils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
 const recordingId = searchParams.get("recordingId");
  const cacheKey = searchParams.get("cacheKey");
  if (!cacheKey && !recordingId ) return NextResponse.json({ error: "Missing cacheKey and recordingId" }, { status: 400 });

  try {
    const info = await getDownloadJobInfo(cacheKey, cacheKey);
    return NextResponse.json(info.status);
  } catch (err) {
    console.warn("Failed to load download status for", cacheKey, err);
    return NextResponse.json({ error: "Status unavailable" });
  }
}
