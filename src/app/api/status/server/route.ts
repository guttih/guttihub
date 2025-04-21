import { startLiveWatcher } from "@/utils/LiveWatcher";

startLiveWatcher(); // 🧠 will run on cold starts only (safe on Vercel/Fly/WSL/etc)

export async function GET() {
    return new Response(
        JSON.stringify({
            serverTime: new Date().toISOString(),
            watcher: "LiveWatcher initialized",
        }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}
