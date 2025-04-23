import { appConfig } from "@/config";

/**
 * Returns a proxied image URL, or the fallback if input is empty, invalid, or already a fallback.
 */
export function makeImageProxyUrl(imageUrl?: string | null): string {
    const fallback = appConfig.fallbackImage;

    // Reject bad/empty input or fallback itself
    if (!imageUrl || imageUrl === "[]" || imageUrl === fallback) {
        return fallback;
    }

    try {
        return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    } catch {
        return fallback;
    }
}
