"use client";

import { showMessageBox } from "@/components/ui/MessageBox";
import { logger } from "@/utils/logger";

export const SystemDiskInfoButton = () => {
    const runDiskCheck = async () => {
        try {
            const res = await fetch("/api/os/system/disk");
            const json = await res.json();

            const output = json.results?.output || {};
            const success = json.results?.success ?? false;
            const missing = json.results?.missing || [];

            const lines = Object.entries(output).map(([key, value]) => `• ${key.replace(/_/g, " ")}: ${value}`);

            if (missing.length) {
                lines.push("\n⚠️ Missing checks: " + missing.join(", "));
            }

            showMessageBox({
                variant: success ? "success" : "warning",
                title: "System Info",
                message: lines.join("\n"),
                toast: true,
                blocking: false,
                position: "top-right",
                preserveLineBreaks: true,
            });
        } catch (err) {
            logger.error("Disk info fetch failed", err);
            showMessageBox({
                variant: "error",
                title: "System Info Error",
                message: "💥 Could not fetch system disk info.",
                toast: true,
                blocking: true,
                preserveLineBreaks: true,
            });
        }
    };

    return (
        <button onClick={runDiskCheck} className="w-full text-left px-4 py-2 hover:bg-gray-700">
            💽 Show System Disk Info
        </button>
    );
};
