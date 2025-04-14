import { appConfig } from "@/config";
export function makeImageProxyUrl(imageUrl: string): string {
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl || appConfig.fallbackImage)}`;
}
