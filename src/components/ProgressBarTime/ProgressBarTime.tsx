import React, { useEffect, useState } from "react";

type DisplayOption = "now" | "start" | "end";
interface ProgressBarTimeProps {
    variant?: "default" | "danger" | "warning" | "important" | "success" | "secondary";
    start: string;
    end: string;
    now: string;
    showTime?: boolean;
    display?: DisplayOption;
}

export function ProgressBarTime({ start, end, now, showTime = false, display = "now", variant = "default"}: ProgressBarTimeProps) {
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

    const variantMap = {
        default: "bg-gray-500",
        important: "bg-blue-600",
        danger: "bg-red-600",
        success: "bg-green-600",
        secondary: "bg-gray-400",
        warning: "bg-yellow-600",
      };

      
    let displayTime: string;
    switch (display) {
        case "start":
            displayTime = new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            break;
        case "end":
            displayTime = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            break;
        case "now":
        default:
            displayTime = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return (
        <div className="relative mt-3 h-3 rounded bg-gray-700 overflow-hidden">
            <div className={`${variantMap[variant ?? "default"]} h-full`} style={{ width: `${percent}%` }} />
            {showTime && <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono">{displayTime}</div>}
        </div>
    );
}
