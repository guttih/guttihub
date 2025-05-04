// src/components/ui/RegexBlock.tsx
"use client";

import React, { useState } from "react";
import { regexBlockClasses } from "@/utils/ui/classNames";

interface Props {
    title?: string;
    children: string;
}

export const RegexBlock = ({ title, children }: Props) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="not-prose mb-4 relative">
            <pre className={`${regexBlockClasses} not-italic relative`}>
                <button
                    onClick={handleCopy}
                    title="Copy to clipboard"
                    className="bg-gray-700/70 backdrop-blur-sm
 absolute top-1 right-2 text-xs px-2 py-0.5 bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600 border border-gray-600 rounded transition"
                >
                    {copied ? "✅ Copied" : "📋 Copy"}
                </button>
                {children}
            </pre>
            {title && <div className="text-xs text-gray-500 font-medium mt-1 text-right">{title}</div>}
        </div>
    );
};
