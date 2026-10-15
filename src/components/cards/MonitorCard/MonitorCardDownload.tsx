"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { MonitorCardBase } from "./MonitorCardBase";
import ProgressBarPercent from "@/components/ProgressBarPercent/ProgressBarPercent";

interface MonitorCardDownloadProps {
    name: string;
    groupTitle?: string;
    logoUrl?: string;
    serviceName?: string;
    startedAt: string;
    user?: string;
    status: string;
    cacheKey: string;
    onKill?: (cacheKey: string) => void;
}

export function MonitorCardDownload({ name, groupTitle, logoUrl, serviceName, startedAt, user, status, cacheKey, onKill }: MonitorCardDownloadProps) {
    const [isLaunchingMonitor, setLaunchingMonitor] = useState(false);
    const [progressPercent, setProgressPercent] = useState<number | null>(null);
    const [contentLength, setContentLength] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchProgress = async () => {
            try {
                const res = await fetch(`/api/download/monitor?cacheKey=${encodeURIComponent(cacheKey)}`);
                const json = await res.json();
                if (res.ok && isMounted) {
                    if (typeof json.progressPercent === "number") {
                        setProgressPercent(json.progressPercent);
                    }
                    if (typeof json.contentLength === "number") {
                        setContentLength(json.contentLength);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch download progress", err);
            }
        };

        fetchProgress();
        const interval = setInterval(fetchProgress, 3000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [cacheKey, contentLength]);

    const handleLaunchMonitor = async () => {
        try {
            setLaunchingMonitor(true);
            await window.open(`/download/status?cacheKey=${encodeURIComponent(cacheKey)}`, "_blank");
            await new Promise((resolve) => setTimeout(resolve, 3000));
        } finally {
            setLaunchingMonitor(false);
        }
    };

    const weHaveProgressInfo = progressPercent !== null && contentLength !== null && contentLength > 0;

    return (
        <MonitorCardBase
            name={name}
            groupTitle={groupTitle}
            logoUrl={logoUrl}
            serviceName={serviceName}
            startedAt={startedAt}
            user={user}
            status={status}
            cacheKey={cacheKey}
            onKill={onKill}
            showKillButton={false}
        >
            <div className="flex flex-col items-start gap-2 text-left w-full">
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLaunchingMonitor}
                    onClick={handleLaunchMonitor}
                    title="Open the download monitor for this download"
                    className="w-full text-left"
                >
                    {isLaunchingMonitor ? "⏳ Launching monitor..." : "🖥️ Monitor"}
                </Button>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open("/download", "_blank", "noopener,noreferrer")}
                    title="Open download queue in a new tab"
                    className="w-full text-left"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block w-4 h-4 mr-1 align-text-bottom">
                        <path d="M4 5h10M4 10h7M4 15h5M4 20h10M18 9v11m-4-4 4 4 4-4" />
                    </svg>
                    Download queue
                    <span className="sr-only"> (opens in a new tab)</span>
                </Button>

                {onKill && (
                    <Button variant="danger" size="sm" onClick={() => onKill(cacheKey)} className="w-full text-left">
                        🔴 Kill
                    </Button>
                )}

                {weHaveProgressInfo && typeof progressPercent === "number" && (
                    <div className="w-full pt-1">
                        <ProgressBarPercent percent={progressPercent} variant="default" />
                    </div>
                )}
            </div>
        </MonitorCardBase>
    );
}
