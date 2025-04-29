"use client";

import { Button } from "@/components/ui/Button/Button";
import { MonitorCardBase } from "./MonitorCardBase";
import { useState } from "react";

interface MonitorCardRecordingProps {
    name: string;
    groupTitle?: string;
    logoUrl?: string;
    serviceName?: string;
    startedAt: string;
    status: string;
    cacheKey: string;
    recordingId: string;
    watchUrl: string;
    onKill?: (cacheKey: string) => void;
}

export function MonitorCardRecording({
    name,
    groupTitle,
    logoUrl,
    serviceName,
    startedAt,
    status,
    cacheKey,
    recordingId,
    watchUrl,
    onKill,
}: MonitorCardRecordingProps) {
    const [isKilling, setIsKilling] = useState(false);
    const [isLaunchingMonitor, setLaunchingMonitor] = useState(false);
    const [isShowing, setIsShowing] = useState(false);
    
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

    const HandleLaunchMonitor = async () => {
        if (!onKill || isKilling) return;
        try {
            setLaunchingMonitor(true);
            await window.open(`/record/status?recordingId=${encodeURIComponent(recordingId)}`, "_blank");
            await new Promise((resolve) => setTimeout(resolve, 5000));
        } finally {
            setLaunchingMonitor(false);
        }
    };

    const HandleShowing = async () => {
        if (isShowing) return;
        try {
            setIsShowing(true);
            await window.open(watchUrl);
            await new Promise((resolve) => setTimeout(resolve, 5000));
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
            showKillButton={false}
            onKill={onKill}
        >
            <div className="flex flex-col items-start gap-2 text-left w-full text-left">
                <Button
                    className="w-full text-left"
                    variant="important"
                    size="sm"
                    disabled={isShowing}
                    onClick={HandleShowing}
                    title="Whatch while recording"
                >
                    
                    {isShowing ? "⏳ Launching player..." : "▶️ Watch"}
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLaunchingMonitor}
                    onClick={HandleLaunchMonitor}
                    title="Open the recording monitor for this recording"
                >
                     {isLaunchingMonitor ? "⏳ Launching monitor..." : "🖥️ Monitor"}
                    
                </Button>

                {onKill && cacheKey && (
                    <Button
                        className="w-full text-left"
                        variant="danger"
                        size="sm"
                        onClick={handleKillClick}
                        disabled={isKilling}
                        title="Stop this recording"
                    >
                         {isKilling ? "⏳ Killing..." : "🔴 Kill"}
                    </Button>
                )}
            </div>
        </MonitorCardBase>
    );
}
