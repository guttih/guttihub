// src/app/api/live/stop/route.ts

import { NextRequest } from "next/server";
import fs from "fs";
import { readRecordingJobFile } from "@/utils/fileHandler";
import { ScheduleResolver } from "@/resolvers/ScheduleResolver";
import { LiveResolver } from "@/resolvers/LiveResolver";

export async function POST(req: NextRequest) {
    try {
        const { recordingId } = await req.json();

        if (!recordingId) {
            return new Response(JSON.stringify({ error: "Missing recordingId" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const job = await readRecordingJobFile(recordingId);
        if (!job) {
            return new Response(JSON.stringify({ error: "Job not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (job.format !== "hls-live" && job.format !== "mp4") {
            return new Response(JSON.stringify({ error: "Not a live job or recording job" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // fetch the status file to get the PID if resolver fails killing the process
        const statusFile = job.statusFile;
        if (!fs.existsSync(statusFile)) {
            return new Response(JSON.stringify({ error: "Status file missing" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        const lines = fs.readFileSync(statusFile, "utf-8").split("\n");
        const pidLine = lines.find((line) => line.startsWith("PID="));
        if (!pidLine) {
            return new Response(JSON.stringify({ error: "PID not found" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // We probably have a PID, so lets kall the right resover

        if (job.format === "mp4") {
            // its a recording job
            ScheduleResolver.stopRecording(recordingId);
        } else { 
            //its a live job
            LiveResolver.stopRecording(recordingId);
        }

        const pid = parseInt(pidLine.replace("PID=", "").trim(), 10);
        if (isNaN(pid)) {
            return new Response(JSON.stringify({ error: "Invalid PID" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // // Maybe we should not kill the process again if it's trying to stop grasefully
        // try {
        //     process.kill(pid, "SIGTERM");
        // } catch {
        //     //console.error("Failed to kill process of job with recordingId:", recordingId);
        //     // Ignore error if process is already dead becuse LiveResolver or ScheduleResolver managed to kill it
        // }


        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Failed to stop live stream:", err);
        return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
