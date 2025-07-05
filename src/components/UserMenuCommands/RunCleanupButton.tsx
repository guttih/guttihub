// src/components/UserMenuCommands/RunCleanupButton.tsx
"use client";

import { showMessageBox } from "@/components/ui/MessageBox";
import { logger } from "@/utils/logger";

export const RunCleanupButton = () => {
    const runCleanup = async () => {
        try {
            const res = await fetch("/api/system/cleanup", {
                method: "POST",
                body: JSON.stringify({ force: true }), // Set to true if you want to force cleanup, even if files are younger than 7 hours
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();

            showMessageBox({
                variant: json.success ? "success" : "warning",
                title: "Cleanup",
                message: json.message || json.error || "Unknown result",
                toast: true,
                blocking: false,
                position: "top-right",
            });
        } catch (err) {
            showMessageBox({
                variant: "error",
                title: "Cleanup Error",
                message: "💥 Cleanup failed.",
                toast: true,
                blocking: true,
            });
            logger.error("Cleanup error:", err);
        }
    };

    return (
        <button
            onClick={runCleanup}
            title="Scans the disk for gosts and zombies and nukes them."
            className="w-full text-left px-4 py-2 hover:bg-gray-700"
        >
            🧹 Run Cleanup Now
        </button>
    );
};
