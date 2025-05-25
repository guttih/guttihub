export function extractLatestDownloadProgressPercent(logLines: string[]): number | null {
    const joined = logLines.join("\n");
    const matches = joined.match(/(\d{1,3}(?:[.,]\d+)?)%/g);

    if (!matches || matches.length === 0) return null;

    const last = matches[matches.length - 1];
    return parseFloat(last.replace("%", ""));
}

export function formatBytes(bytes: number): string {
    if (typeof bytes !== "number" || isNaN(bytes)) return "N/A";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
}
