// src/components/ImageUpload.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
interface ImageUploadProps {
    value?: string;
    onChange: (file: File | null) => void;
    filename?: string;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!previewUrl && value) {
            setPreviewUrl(value.startsWith("/") ? value : `/uploads/avatars/${value}`);
        }
    }, [value, previewUrl]);

    function handleClick() {
        inputRef.current?.click();
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
        onChange(file);
    }

    const imageSrc = previewUrl || "/placeholder-profile.svg";

    return (
        <div className="flex justify-center mb-4">
            <div
                onClick={handleClick}
                className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer border-2 border-gray-300 shadow hover:shadow-md transition"
                title="Click to change profile image"
            >
                <Image src={imageSrc} alt="Profile preview" fill sizes="(max-width: 128px) 100vw, 128px" className="object-cover" />
                <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} className="hidden" />
            </div>
        </div>
    );
}

