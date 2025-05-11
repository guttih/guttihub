"use client";

import { useEffect, useState, useRef } from "react";
import { getLatestStatus } from "@/utils/statusHelpers";

interface Props {
    recordingId: string;
    intervalMs?: number;
    autoScroll?: boolean;
}

export function LiveLogViewer({ recordingId, intervalMs = 1000, autoScroll = true }: Props) {
    const [log, setLog] = useState("(fetching log...)");
    const ref = useRef<HTMLPreElement>(null);
    const userScrolledUpRef = useRef(false);

    useEffect(() => {
        let mounted = true;
        const donePollCount = { current: 0 };

        const fetchLogAndStatus = async () => {
            try {
                console.log("📡 Polling log + status... " + donePollCount.current); //remove
                const [logRes, statusRes] = await Promise.all([
                    fetch(`/api/record/log?recordingId=${recordingId}`),
                    fetch(`/api/record/status?recordingId=${recordingId}`),
                ]);

                const logJson = await logRes.json();
                const statusJson = await statusRes.json();

                if (mounted && logJson?.log) {
                    setLog(logJson.log);
                }

                const status = getLatestStatus(statusJson?.STATUS);
                if (["done", "stopped", "error"].includes(status)) {
                    donePollCount.current++;
                    if (donePollCount.current >= 5) {
                        console.log("🛑 Stopping log polling after 5 post-done fetches"); //remove
                        return true; // tell polling loop to stop
                    }
                } else {
                    donePollCount.current = 0;
                }
            } catch (err) {
                console.warn("⚠️ Log fetch failed", err);
            }

            return false; // continue polling
        };

        let interval: NodeJS.Timeout;
        let stopped = false;

        const startPolling = () => {
            console.log("🛑 Stopping log polling after 5 post-done fetches");

            interval = setInterval(async () => {
                if (stopped) return;
                const shouldStop = await fetchLogAndStatus();
                if (shouldStop) {
                    stopped = true;
                    clearInterval(interval);
                }
            }, intervalMs);
        };

        fetchLogAndStatus(); // initial fetch
        startPolling(); // begin interval polling

        return () => {
            mounted = false;
            stopped = true;
            clearInterval(interval);
        };
    }, [recordingId, intervalMs]);

    useEffect(() => {
        if (autoScroll && ref.current && !userScrolledUpRef.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
        }
    }, [log, autoScroll]);

    const handleScroll = () => {
        const el = ref.current;
        if (!el) return;
        const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
        userScrolledUpRef.current = !isAtBottom;
    };

    return (
        <pre ref={ref} onScroll={handleScroll} className="bg-gray-900 p-4 rounded text-xs overflow-auto max-h-[300px] border border-gray-700">
            {log}
        </pre>
    );
}
