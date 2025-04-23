// src/app/api/live/active/count/route.ts
import { NextResponse } from "next/server";
import { getCombinedActiveCount } from "@/utils/concurrency";

export async function GET(req: Request) {
  const serviceId = new URL(req.url).searchParams.get("serviceId");
  if (!serviceId) {
    return NextResponse.json(
      { error: "Missing serviceId", count: 0 },
      { status: 400 }
    );
  }

  try {
    const count = await getCombinedActiveCount(serviceId);
    return NextResponse.json({ count });
  } catch (err) {
    console.error("❌ Failed to get combined count for", serviceId, err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
