"use client";

import { showMessageBox } from "@/components/ui/MessageBox";
import { logger } from "@/utils/logger";

export const AboutButton = () => {
    const handleClick = async () => {
        try {
            const res = await fetch("/api/os/system/about");
            const json = await res.json();

            if (!json.success) throw new Error(json.error || "Unknown error");

            const { name, version, description, author, homepage, platform, arch, nodeVersion, uptime } = json.data;

            const lines = [
                `🧠 ${name} — v${version}`,
                description && "",
                description && `\n📖 ${description}\n`,
                description && "",
                `👤 Author: ${author}`,
                homepage && `🔗 Homepage: ${homepage}`,
                "",
                `🖥️ Platform: ${platform} (${arch})`,
                `🔧 Node.js: ${nodeVersion}`,
                `⏱️ Uptime: ${uptime}`,
                `\n🐛 issues:`,
                `\u2003↪ https://github.com/guttih/guttihub/issues`,
            ].filter(Boolean); // remove falsey entries like undefined

            showMessageBox({
                variant: "default",
                title: "About This App",
                message: lines.join("\n"),
                toast: true,
                blocking: true,
                preserveLineBreaks: true,
            });
        } catch (err) {
            logger.error("AboutButton fetch error:", err);
            showMessageBox({
                variant: "error",
                title: "App Info Error",
                message: "❌ Could not load about info from the server.",
                toast: true,
                blocking: true,
            });
        }
    };

    return (
        <button onClick={handleClick} className="w-full text-left px-4 py-2 hover:bg-gray-700">
            📖 About This App
        </button>
    );
};
