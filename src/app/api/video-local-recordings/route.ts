import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { M3UEntry } from "@/types/M3UEntry";
import { CashedEntries } from "@/types/CashedEntries";
import { StreamFormat, getStreamFormatByExt } from "@/types/StreamFormat";
import { ContentCategoryFieldLabel, inferContentCategory } from "@/types/ContentCategoryFieldLabel";
import { makeSuccessResponse, makeErrorResponse } from "@/types/ApiResponse";
import { getRecordingJobsDir, readJsonFile } from "@/utils/fileHandler";
import { RecordingJobInfo } from "@/types/RecordingJobInfo";
import { StreamingService } from "@/types/StreamingService";
import { services } from "@/config";

export async function GET(req: NextRequest) {
    try {
        console.log("📦 src/app/api/video-local-recordings/route.ts is executing");
        const service = services.find((s) => s.id === "local-recordings");
        if (!service) {
            return makeErrorResponse("Service not found", 404);
        }
        const jobEntries = await loadValidJobEntries();
        const origin = req.nextUrl.origin;
        const fallbackEntries = await loadFallbackEntriesFromDisk(service, origin);
        const allEntries = [...jobEntries, ...fallbackEntries];
        const response = buildResponse(allEntries);

        return makeSuccessResponse(response);
    } catch (error) {
        console.error("❌ Failed to load recordings index", error);
        return makeErrorResponse("Internal Server Error", 500);
    }
}

async function loadValidJobEntries(): Promise<M3UEntry[]> {
    const entries: M3UEntry[] = [];
    const usedUrls = new Set<string>();
    const dir = getRecordingJobsDir();
    const files = await fs.readdir(dir);

    for (const file of files) {
        if (!file.endsWith("-info.json")) continue;

        const fullPath = path.join(dir, file);
        let jobInfo: RecordingJobInfo;

        try {
            jobInfo = await readJsonFile<RecordingJobInfo>(fullPath);
        } catch (err) {
            console.warn(`⚠️ Failed to parse job file: ${file}`, err);
            continue;
        }

        const outputFile = jobInfo?.job?.outputFile;
        if (!outputFile || !outputFile.endsWith(".mp4")) {
            console.warn(`⚠️ Skipping non-mp4 job: ${file}`);
            continue;
        }

        if (!existsSync(outputFile)) {
            console.warn(`🗑️ Deleting stale job file: ${file} → missing ${outputFile}`);
            await fs.unlink(fullPath);
            continue;
        }

        const fileName = path.basename(outputFile);
        if (!jobInfo.entry) {
            console.warn(`⚠️ Skipping job with missing entry: ${file}`);
            continue;
        }
        
        const entry: M3UEntry = {
            ...jobInfo.entry,
            groupTitle: "Recorded",
            tvgLogo: jobInfo.entry.tvgLogo || "/fallback.png",
            url: `/api/video/local-recordings/${fileName}`,
        };
        

        usedUrls.add(fileName);
        entries.push(entry);
    }

    return entries;
}

async function loadFallbackEntriesFromDisk(service: StreamingService): Promise<M3UEntry[]> {
    const entries: M3UEntry[] = [];

    const baseDir = path.resolve(process.cwd(), "public", "videos");
    const subfolders = await fs.readdir(baseDir);

    for (const subfolder of subfolders) {
        const folderPath = path.join(baseDir, subfolder);
        const stat = await fs.stat(folderPath);
        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(folderPath);

        for (const file of files) {
            if (!file.endsWith(".mp4") && !file.endsWith(".mkv")) continue;

            const filePath = path.join(folderPath, file);
            const fileStats = await fs.stat(filePath);
            const created = fileStats.birthtime.toISOString().slice(0, 10);

            const entry: M3UEntry = {
                tvgId: "",
                tvgName: file.replace(/\.(mp4|mkv)$/, ""),
                tvgLogo: "/fallback.png",
                groupTitle: subfolder, // like "recordings" or "movies"
                name: `${file.replace(/\.(mp4|mkv)$/, "")} (${created})`,
                url: `${service.viewingBaseUrl}/${subfolder}/${file}`,
            };

            entries.push(entry);
        }
    }

    return entries;
}


function buildResponse(entries: M3UEntry[]): CashedEntries {
    return {
        snapshotId: `recordings-${Date.now()}`,
        timeStamp: new Date().toISOString(),
        servers: ["local-recordings"],
        entries,
        formats: Array.from(new Set(entries.map((e) => getStreamFormatByExt(e.url)))),
        categories: Array.from(new Set(entries.map((e) => inferContentCategory(e.url)))).filter(Boolean) as ContentCategoryFieldLabel[],
    };
}
