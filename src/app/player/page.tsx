export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { PlayerClient } from "@/components/Player/PlayerClient";
import { StreamingServiceResolver } from "@/utils/StreamingServiceResolver";
import { appConfig } from "@/config";
export default async function PlayerPage({ searchParams }: { searchParams: Promise<{ streamUrl?: string }> }) {
    const query = await searchParams;
    const encodedUrl = query?.streamUrl;
    const url = encodedUrl ? decodeURIComponent(encodedUrl)  : "";
    if (!url) {
        return <div className="text-red-500 p-4">Missing the &apos;streamUrl&apos; parameter from the URL.</div>;
    }
    
    console.log("got streamUrl:", url); // Debug line
    
    let playUrl = url;
    if (appConfig.hideCredentialsInUrl) {
        const urlServiceValues = StreamingServiceResolver.splitStreamingSearchUrl(url || "");

        if (!urlServiceValues) {
            return <div className="text-red-500 p-4">Invalid stream URL, missing vital parts.</div>;
        }

        const service = StreamingServiceResolver.findStreamingServiceByServerValue(urlServiceValues.server);
        if (!service) {
            return <div className="text-red-500 p-4">Service not found for the provided URL.</div>;
        }

        console.log("service:", service); // Debug line

        playUrl = StreamingServiceResolver.unsanitizeUrl(url, service.username, service.password);
    }

    return (
        <main className="p-4 max-w-4xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Stream Player</h1>
            <PlayerClient url={playUrl} />
        </main>
    );
}
