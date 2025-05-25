// src/utils/ui/statusHelpers.js

/** Always return the last status value, whether it’s a string or an array. */
// export function getLatestStatus(raw: string | string[] | undefined): string {
//   if (typeof raw === "undefined" || raw === null) return "unknown";
//   return Array.isArray(raw) ? raw[raw.length - 1] : raw;
// }

export type StatusValue = string | string[] | undefined;

export function getLatestStatus(raw: StatusValue): string {
    if (!raw) return "unknown";
    return Array.isArray(raw) ? raw[raw.length - 1] : raw;
}
