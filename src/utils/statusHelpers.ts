// src/utils/ui/statusHelpers.js

/** Always return the last status value, whether it’s a string or an array. */
export function getLatestStatus(raw: string | string[] | undefined): string {
    if (!raw) return "unknown";
    return Array.isArray(raw) ? raw[raw.length - 1] : raw;
}
