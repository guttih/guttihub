// src/utils/job/XjobStatusHelpers.ts

import { readFile } from "@/utils/fileHandler";

/**
 * Parses key=value lines from a .status file.
 * Repeated keys → arrays.
 */
export async function XreadJobStatusFile(statusPath: string): Promise<Record<string, string | string[]>> {
    const result: Record<string, string | string[]> = {};
    try {
        const text = await readFile(statusPath);
        for (const line of text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)) {
            const [key, ...rest] = line.split("=");
            const value = rest.join("=");
            if (!(key in result)) {
                result[key] = value;
            } else if (typeof result[key] === "string") {
                result[key] = [result[key] as string, value];
            } else {
                (result[key] as string[]).push(value);
            }
        }
    } catch (err) {
        console.warn(`⚠️ XreadJobStatusFile failed for ${statusPath}:`, err);
    }
    return result;
}

/**
 * Turn raw text into key→value where repeated keys overwrite.
 * Use when you only want the *latest* value.
 */
export function XparseLatestStatus(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)) {
        const [key, ...rest] = line.split("=");
        result[key] = rest.join("=");
    }
    return result;
}

/**
 * Turn raw text into key→all-values[].
 * Use when full history matters (e.g. PID history).
 */
export function XparseFullStatus(text: string): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const line of text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)) {
        const [key, ...rest] = line.split("=");
        const value = rest.join("=");
        if (!result[key]) result[key] = [];
        result[key].push(value);
    }
    return result;
}

/**
 * Normalize job status into limited states for logic/UI consistency.
 */
export function XnormalizeStatus(raw: string): "recording" | "done" | "error" | "downloading" | "live" | "unknown" {
    const s = raw.toLowerCase();
    if (s.includes("error")) return "error";
    if (s.includes("downloading")) return "downloading";
    if (s.includes("live")) return "live";
    if (s.includes("recording")) return "recording";
    if (s.includes("packaging") && s.includes("done")) return "done";
    if (s === "done" || s === "stopped") return "done";
    return "unknown";
}

/**
 * Converts normalized status → user-friendly label.
 */
export function XhumanizeStatus(raw: string): string {
    switch (XnormalizeStatus(raw)) {
        case "recording":
            return "Recording";
        case "downloading":
            return "Downloading";
        case "done":
            return "Done";
        case "error":
            return "Error";
        default:
            return "Unknown";
    }
}
