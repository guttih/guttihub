"use client";

import React from "react";
import { supportedFormats } from "@/types/StreamFormat";

interface PlayerButtonProps {
    streamUrl: string;
    className?: string;
    showUnsupported?: boolean; 
}

export function PlayerButton({ streamUrl, className = "", showUnsupported }: PlayerButtonProps) {
    const extension = streamUrl.split(".").pop()?.toLowerCase();
    const supported = supportedFormats.map((format) => format.toLowerCase());


    const playUrl = `/player?streamUrl=${encodeURIComponent(streamUrl)}`; // Debug line

    if (!extension) {
        return null; // skip if extension missing
    }
    // Change this to get /player/serviceId/streamId
    // For supported formats, show the play button
    if (showUnsupported || supported.includes(extension)) {
        return (
            <a href={`${playUrl}`} className={`text-blue-400 text-sm hover:underline ${className}`} title="Play stream">
                ▶ Play Stream
            </a>
        );
    }

    //   if (supported.includes(extension)) {
    //     return (
    //       <form action="/player/submit" method="POST" className={className}>
    //         <input type="hidden" name="url" value={streamUrl} />
    //         <button type="submit" className="text-blue-400 text-sm hover:underline" title="Play stream">
    //           ▶ Play Stream
    //         </button>
    //       </form>
    //     );
    //   }

    // For unsupported formats, show download link
    return (
        <a href={streamUrl} download className="text-green-400 text-sm hover:underline" title={`Download ${extension.toUpperCase()} file`}>
            ⬇ Download {extension.toUpperCase()}
        </a>
    );
}
