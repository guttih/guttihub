"use client";

import React, { useRef } from "react";
import ReactHlsPlayer from "@gumlet/react-hls-player";
import { detectStreamFormat, StreamFormat } from "@/types/StreamFormat";

export interface InlineHlsPlayerProps {
    url: string;
    autoPlay?: boolean;
    controls?: boolean;
    title?: string;
    className?: string;
    onClose?: () => void;
}

export const InlineHlsPlayer: React.FC<InlineHlsPlayerProps> = ({
    url,
    autoPlay = true,
    controls = true,
    title,
    className = "w-full aspect-video rounded shadow-md",
    onClose,
}) => {
    const format = detectStreamFormat(url);
    const isHls = format === StreamFormat.M3U8;
    const videoRef = useRef<HTMLVideoElement>(null!) as React.RefObject<HTMLVideoElement>;



    return (
        <div className={`relative ${className}`}>
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
                    title="Close player"
                >
                    ✕
                </button>
            )}

            {title && (
                <div className="absolute top-1 left-1 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded z-10">
                    {title}
                </div>
            )}

            {isHls ? (
                <ReactHlsPlayer
                     playerRef={videoRef} 
                    src={url}
                    autoPlay={autoPlay}
                    controls={controls}
                    width="100%"
                    height="100%"
                />
            ) : (
                <video
                    src={url}
                    controls={controls}
                    autoPlay={autoPlay}
                    className="w-full h-full object-contain"
                    playsInline
                />
            )}
        </div>
    );
};
