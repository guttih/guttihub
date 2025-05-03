import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import { readJsonFile } from "@/utils/fileHandler";

export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = await readJsonFile<{
      name: string;
      version: string;
      author?: string;
      homepage?: string;
      description?: string;
    }>(pkgPath);

    const data = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description ?? "No description provided.",
      author: pkg.author ?? "Unknown",
      homepage: pkg.homepage ?? null,
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: formatDuration(os.uptime()),
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("❌ Failed to load about info:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load system about info." },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
