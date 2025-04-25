import React, { useEffect, useState } from "react";

interface ProgressBarTimeProps {
    start: string;
    end: string;
    now: string;
    showTime?: boolean;
}

export function ProgressBarTime({ start, end, now, showTime = false }: ProgressBarTimeProps) {
    const [percent, setPercent] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date(now));

    useEffect(() => {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();

        const update = () => {
            const now = new Date();
            setCurrentTime(now);
            const total = endTime - startTime;
            const elapsed = now.getTime() - startTime;
            const progress = Math.min(1, elapsed / total);
            setPercent(progress * 100);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [start, end]);

    return (
        <div className="relative mt-3 h-3 rounded bg-gray-700 overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-300 ease-linear" style={{ width: `${percent}%` }} />
            {showTime && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            )}
        </div>
    );
}
