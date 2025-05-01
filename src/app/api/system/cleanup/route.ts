// src/app/api/system/cleanup/route.ts

import { NextResponse } from "next/server";
import { cleanupFinishedJobs } from "@/utils/resolverUtils";
import { getUserRoleServerOnly } from "@/utils/serverOnly/hasUserAccessLevel";
import { isAdmin } from "@/types/UserRole";

export async function POST(req: Request) {
  try {
    const { force } = await req.json().catch(() => ({}));

    const role = await getUserRoleServerOnly();
    if (force && !isAdmin(role)) {
      return NextResponse.json(
        { success: false, error: "You are not allowed to force cleanup." },
        { status: 403 }
      );
    }

    await cleanupFinishedJobs({ force: !!force });
    return NextResponse.json({
      success: true,
      message: `Cleanup complete${force ? " (forced)" : ""}.`,
    });
  } catch (err) {
    console.error("🧨 Cleanup failed:", err);
    return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
