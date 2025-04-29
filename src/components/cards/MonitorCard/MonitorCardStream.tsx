"use client";

import { Button } from "@/components/ui/Button/Button";
import { MonitorCardBase } from "./MonitorCardBase";
import { useState } from "react";

interface MonitorCardStreamProps {
    name: string;
    groupTitle?: string;
    logoUrl?: string;
    serviceName?: string;
    startedAt: string;
    status: string;
    watchUrl: string;
    cacheKey: string;
    onKill?: (cacheKey: string) => void;
    onInlinePlay?: (url: string) => void;
}

export function MonitorCardStream({
    name,
    groupTitle,
    logoUrl,
    serviceName,
    startedAt,
    status,
    watchUrl,
    cacheKey,
    onKill,
    onInlinePlay,
}: MonitorCardStreamProps) {
    const [isShowing, setIsShowing] = useState(false);

    const handleWatchClick = async () => {
        if (isShowing) return;
        try {
            setIsShowing(true);
            await window.open(watchUrl);
        } finally {
            setIsShowing(false);
        }
    };
    const HandleOnInlinePlay = async (url: string) => {
        if (isShowing) return;
        try {
            setIsShowing(true);
            await onInlinePlay?.(url);
        } finally {
            setIsShowing(false);
        }
    };

    return (
        <MonitorCardBase
            name={name}
            groupTitle={groupTitle}
            logoUrl={logoUrl}
            serviceName={serviceName}
            startedAt={startedAt}
            status={status}
            cacheKey={cacheKey}
            onKill={onKill}
        >
            <Button
                className="w-full text-left min-w-[120px]"
                variant="default"
                size="sm"
                disabled={isShowing}
                onClick={handleWatchClick}
                title="Watch stream"
            >
                {isShowing ? "⏳ Opening..." : "▶️ Watch stream"}
            </Button>
            {onInlinePlay && (
                <Button
                    className="w-full text-left min-w-[120px]"
                    variant="default"
                    size="sm"
                    onClick={() => HandleOnInlinePlay(watchUrl)}
                    title="Watch inside the app"
                >
                    🎬 Play inside
                </Button>
            )}
        </MonitorCardBase>
    );
}
