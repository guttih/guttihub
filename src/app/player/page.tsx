export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { PlayerClient } from "@/components/PlayerClient/PlayerClient";
export default async function PlayerPage({ searchParams }: { searchParams: Promise<{ streamUrl?: string }> }) {
    const query = await searchParams;
    const encodedUrl = query?.streamUrl;
    const url = encodedUrl ? decodeURIComponent(encodedUrl)  : "";
    if (!url) {
        return <div className="text-red-500 p-4">Missing the &apos;streamUrl&apos; parameter from the URL.</div>;
    }
    
    return (
        <main className="p-4 max-w-4xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Stream Player</h1>
            <PlayerClient url={url} autoPlay={true} />
        </main>
    );
}
