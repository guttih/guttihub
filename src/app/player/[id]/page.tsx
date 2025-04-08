export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getStreamUrl } from "@/lib/streamStore";
import PlayerClient from "@/components/Player/PlayerClient";

export default async function PlayerPage({ params }: { params: { id: string } }) {
    const id = params.id;
    const url = getStreamUrl(id);

    console.log("Server PlayerPage URL:", url);

    if (!url) {
        return <div className="text-red-500 p-4">Stream not found or expired.</div>;
    }

    return (
        <main className="p-4 max-w-4xl mx-auto">
            <h1 className="text-xl font-bold mb-4">Stream Player</h1>
            <PlayerClient url={url} />
        </main>
    );
}
