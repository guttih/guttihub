"use client";

import React from "react";
import { supportedFormats } from "@/types/StreamFormat";
import { ServiceController } from "@/utils/ServiceController";

interface PlayerButtonProps {
    streamUrl: string;
    className?: string;
}

export function PlayerButton({ streamUrl, className = "" }: PlayerButtonProps) {
    const extension = streamUrl.split(".").pop()?.toLowerCase();
    const supported = supportedFormats.map((format) => format.toLowerCase());
    const serviceObj = ServiceController.findStreamingServiceByViewingUrl(streamUrl);
    const urlValues = ServiceController.splitStreamingSearchUrl(streamUrl);
    console.log(`PlayerButton::Got Service Object: ${JSON.stringify(urlValues)}`);
    const serviceId = serviceObj?.id || null;
    const streamId = ServiceController.extractLastPartOfUrl(streamUrl);

    console.log(`PlayerButton::Got Service ID: ${serviceId}, Stream ID: ${streamId}`);
    console.log("Urlvalues", JSON.stringify(urlValues, null, 4));

    let playUrl = `/player/${serviceId}/${streamId}`;
    console.log(`1PlayerButton::playUrl: ${playUrl}`);
    if (urlValues) {
        playUrl = `/player/${serviceId}/${urlValues.pathStart}/${streamId}`;
    }
    console.log(`2PlayerButton::playUrl: ${playUrl}`);

    if (!extension) {
        return null; // skip if extension missing
    }
    // Change this to get /player/serviceId/streamId
    // For supported formats, show the play button
    if (supported.includes(extension)) {
        console.log(`PlayerButton::making get request to /player/${serviceId}/${streamId}`);
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
