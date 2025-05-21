// src/app/api/system-check/route.ts

import { NextResponse } from "next/server";
import { checkSystemInfo } from "@/utils/serverOnly/systemInfo";

export async function GET() {
  try {
    const results = await checkSystemInfo();

    return NextResponse.json({
      ok: results.success,
      results,
    });
  } catch (error) {
    console.error("System check route error:", error);
    
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected Server Error",
        reason: "An unexpected error occurred while running system check.",
        results: {
          success: false,
          missing: [],
          output: {},
        },
      },
      {
        status: 500,
      }
    );
  }
}
