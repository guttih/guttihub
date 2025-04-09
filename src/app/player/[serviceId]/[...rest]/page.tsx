export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { PlayerClient } from "@/components/Player/PlayerClient";
import { ServiceController } from "@/utils/ServiceController";

export default async function PlayerPage({ params }: { params: { serviceId: string; rest?: string[] } }) {
    const { serviceId, rest = [] } = params;

    let url = "";
    if (rest.length == 2) {
        url = ServiceController.makeViewingUrl(serviceId, rest[0], rest[1]);
    } else {
        url = ServiceController.makeViewingUrl(serviceId, null, rest[0]);
    }

    console.log("viewurl:", url); // Debug line

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
