"use client";

import { Button } from "@/components/ui/Button/Button";
import React, { useState } from "react";

interface MonitorCardBaseProps {
    name: string;
    groupTitle?: string;
    logoUrl?: string;
    serviceName?: string;
    startedAt: string;
    status: string;
    children?: React.ReactNode;
    cacheKey: string;
    showKillButton?: boolean;
    onKill?: (cacheKey: string) => void;
}

export function MonitorCardBase({
    name,
    groupTitle,
    logoUrl,
    serviceName,
    startedAt,
    status,
    children,
    cacheKey,
    showKillButton = true,
    onKill,
}: MonitorCardBaseProps) {
    const [isKilling, setIsKilling] = useState(false);

    const handleKillClick = async () => {
        if (!onKill || isKilling) return;
        try {
            setIsKilling(true);
            await onKill(cacheKey);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        } finally {
            setIsKilling(false);
        }
    };

    return (
        <div className="bg-gray-800 hover:bg-gray-750 hover:ring-1 hover:ring-gray-700 rounded p-6 shadow-lg w-full transition-all duration-200">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <img
                            src={logoUrl || "/fallback.png"}
                            alt={serviceName || "Service"}
                            title={serviceName || "Unknown Service"}
                            className="w-5 h-5 rounded object-cover"
                        />
                        <span className="text-sm text-gray-300">{serviceName || "Unknown Service"}</span>
                    </div>

                    <p className="font-semibold">{name}</p>
                    {groupTitle && <p className="text-sm text-gray-400">{groupTitle}</p>}
                    <p className="text-xs text-gray-500">Started: {new Date(startedAt).toLocaleString()}</p>
                    <p className="text-xs mt-2">
                        <span className="font-bold">Status:</span> {status}
                    </p>
                </div>

                <div className="flex flex-col items-start gap-2 text-left">
                    {children}

                    {showKillButton && onKill && cacheKey && (
                        <Button
                            className="w-full text-left"
                            variant="danger"
                            size="sm"
                            title="Stop this job"
                            onClick={handleKillClick}
                            disabled={isKilling}
                        >
                            {isKilling ? "⏳ Killing..." : "🔴 Kill"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
