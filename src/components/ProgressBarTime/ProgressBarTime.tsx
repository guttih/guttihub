import React, { useEffect, useState } from "react";

export function formatDuration(seconds: number): string {
    const value = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const remaining = value % 60;
    return `${hours ? `${hours}h ` : ""}${minutes}m ${remaining.toString().padStart(2, "0")}s`;
}

type DisplayOption = "now" | "start" | "end" | "elapsed";
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

        const serverNow = now;
        const receivedAt = Date.now();
        const update = () => {
            const now = new Date(new Date(serverNow).getTime() + Date.now() - receivedAt);
            setCurrentTime(now);
            const total = endTime - startTime;
            const elapsed = now.getTime() - startTime;
            const progress = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
            setPercent(progress * 100);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [start, end, now]);

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
        case "elapsed": {
            const elapsed = Math.min(new Date(end).getTime() - new Date(start).getTime(), currentTime.getTime() - new Date(start).getTime());
            const remaining = new Date(end).getTime() - currentTime.getTime();
            displayTime = `${formatDuration(elapsed / 1000)} elapsed · ${formatDuration(remaining / 1000)} left`;
            break;
        }
        case "start":
            displayTime = new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            break;
        case "end":
            displayTime = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            break;
        case "now":
        default:
            displayTime = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }

    return (
        <div>
        <div className={`relative mt-3 ${display === "elapsed" ? "h-7" : "h-3"} rounded bg-gray-700 overflow-hidden`}>
            <div className={`${variantMap[variant ?? "default"]} h-full`} style={{ width: `${percent}%` }} />
            {showTime && <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono">{displayTime}</div>}
        </div>
        {display === "elapsed" && <div className="mt-2 text-xs text-gray-400">
            Current time <span className="font-mono">{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
        </div>}
        </div>
    );
}
