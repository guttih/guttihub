import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { StatusResolver } from "@/resolvers/StatusResolver";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recordingId = searchParams.get("recordingId");
  const outputDir = searchParams.get("outputDir");

  // Validate inputs
  if (!recordingId || !outputDir) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  // Optional: add simple directory whitelisting or pattern checks
  if (!outputDir.startsWith("/mnt/")) {
    return NextResponse.json({ error: "Invalid output directory" }, { status: 403 });
  }

  const status = await StatusResolver.getStatus(recordingId, outputDir);
  return NextResponse.json(status);
}
