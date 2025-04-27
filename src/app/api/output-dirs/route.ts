import { NextResponse } from "next/server";
import { outDirectories } from "@/config";


export async function GET() {
    // const configPath = path.resolve("src/config/output-dirs.json");
//   try {
//     const data = await fs.readFile(configPath, "utf-8");
//     const folders = JSON.parse(data);
//     return NextResponse.json(folders);
//   } catch (err) {
//     console.error("Failed to read output folders config", err);
//     return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
//   }
    return NextResponse.json(outDirectories, { status: 200 });
}
