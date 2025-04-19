import React, { useEffect, useState } from "react";

export function ProgressBarTime({ start, end, now }: { start: string; end: string; now: string }) {
    const [percent, setPercent] = useState(0);

    useEffect(() => {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const currentTime = new Date(now).getTime();


        const update = () => {
            const now = currentTime;
            const total = endTime - startTime;
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / total);
            setPercent(progress * 100);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [start, end, now]);

    return (
        <div className="mt-3 h-3 rounded bg-gray-700 overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-300 ease-linear" style={{ width: `${percent}%` }} />
        </div>
    );
}
