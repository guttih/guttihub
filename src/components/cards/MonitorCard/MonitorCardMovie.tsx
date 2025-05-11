"use client";

import { MonitorCardBase } from "./MonitorCardBase";

interface MonitorCardMovieProps {
    name: string;
    groupTitle?: string;
    logoUrl?: string;
    serviceName?: string;
    startedAt: string;
    status: string;
    cacheKey: string;
    onKill?: (cacheKey: string) => void;
    onInlinePlay?: (url: string) => void;
}

export function MonitorCardMovie({ name, groupTitle, logoUrl, serviceName, startedAt, status, cacheKey, onKill }: MonitorCardMovieProps) {
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
            showKillButton={false}
        >
            {/* {showPlayButton && (
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
            )}
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
            )} */}
        </MonitorCardBase>
    );
}
