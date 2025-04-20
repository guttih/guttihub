import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const configPath = path.resolve("src/config/output-dirs.json");

export async function GET() {
  try {
    const data = await fs.readFile(configPath, "utf-8");
    const folders = JSON.parse(data);
    return NextResponse.json(folders);
  } catch (err) {
    console.error("Failed to read output folders config", err);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}
