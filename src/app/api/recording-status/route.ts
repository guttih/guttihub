// src/app/api/recording-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { RecordingStatusResolver } from "@/resolvers/RecordingStatusResolver";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recordingId = searchParams.get("recordingId");

  if (!recordingId) {
    return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });
  }

  const status = await RecordingStatusResolver.getStatusByRecordingId(recordingId);
  return NextResponse.json(status);
}
