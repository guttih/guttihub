// src/app/api/download/status/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { getDownloadJobInfo } from "@/utils/resolverUtils";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const recordingId = searchParams.get("recordingId");
  const cacheKey = searchParams.get("cacheKey");
  if (!recordingId) return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });

  try {
    const info = await getDownloadJobInfo(cacheKey, recordingId);
    return NextResponse.json(info.status);
  } catch (err) {
    console.warn("Failed to load download status for", recordingId, err);
    return NextResponse.json({ error: "Status unavailable" });
  }
}
