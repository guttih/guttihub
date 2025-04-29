"use client";

import { MonitorCardBase } from "./MonitorCardBase";

interface MonitorCardDownloadProps {
    name: string;
    groupTitle?: string;
    logoUrl?: string;
    serviceName?: string;
    startedAt: string;
    status: string;
    cacheKey: string;
    onKill?: (cacheKey: string) => void;
}

export function MonitorCardDownload({
    name,
    groupTitle,
    logoUrl,
    serviceName,
    startedAt,
    status,
    cacheKey,
    onKill,
}: MonitorCardDownloadProps) {
    
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
            
        </MonitorCardBase>
    );
}
