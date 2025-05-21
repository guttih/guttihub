// src/components/UserMenuCommands/SystemCheckButton.tsx
"use client";

import { showMessageBox } from "@/components/ui/MessageBox";

export const SystemCheckButton = () => {
    const runSystemCheck = async () => {
        try {
            const res = await fetch("/api/os/system/check");
            const json = await res.json();

            const output = json.results?.output || {};
            const success = json.results?.success ?? false;
            const longestToolName = Math.max(...Object.keys(output).map((t) => t.length));
            const reportLines = Object.entries(output).map(([tool, path]) => {
                const padded = tool.padEnd(longestToolName);
                return `${path ? "✅" : "❌"} ${padded}: ${path || "NOT FOUND"}`;
            });

            showMessageBox({
                variant: success ? "success" : "error",
                title: "System Check",
                message: `${success ? "✅ All dependencies installed." : "❌ Missing dependencies."}\n\n${reportLines.join("\n")}`,
                toast: true,
                blocking: false,
                preserveLineBreaks: true,
                position: "top-right",
            });
        } catch (err) {
            showMessageBox({
                variant: "error",
                title: "System Check Error",
                message: "💥 Backend check failed.",
                toast: true,
                blocking: true,
                preserveLineBreaks: true,
            });
            console.error("System check failed:", err);
        }
    };

    return (
        <button
            onClick={runSystemCheck}
            className="w-full text-left px-4 py-2 hover:bg-gray-700"
            title="Check if minimum dependencies this application requres"
        >
            🧪 System Environment Check
        </button>
    );
};
