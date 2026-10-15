"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { useCallback, useEffect, useState } from "react";
import type { DownloadQueueState, QueueAction } from "@/types/DownloadQueue";
import DownloadMonitor from "@/components/DownloadMonitor/DownloadMonitor";

export default function DownloadQueue() {
    const [queue, setQueue] = useState<DownloadQueueState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playlistMessage, setPlaylistMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/download/queue", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setQueue(data);
            setError(null);
        } catch (err) { setError((err as Error).message); }
    }, []);
    useEffect(() => {
        void refresh();
        const timer = setInterval(() => void refresh(), 3000);
        return () => clearInterval(timer);
    }, [refresh]);
    async function act(action: QueueAction, id?: string) {
        setBusy(true);
        try {
            const res = await fetch("/api/download/queue", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setQueue(data);
            setError(null);
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
    }
    async function createPlaylist() {
        setBusy(true);
        setPlaylistMessage(null);
        try {
            const res = await fetch("/api/download/queue/playlist", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPlaylistMessage(`Created ${data.filename} beside your media files (${data.count} downloads, in queue order).`);
        } catch (err) { setPlaylistMessage((err as Error).message); }
        finally { setBusy(false); }
    }
    const details = queue?.items.find((item) => item.id === selected);
    return (
        <main className="mx-auto max-w-5xl space-y-6 p-6">
            <Link href="/" className="text-purple-300 hover:underline">← Back to search</Link>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Downloads</h1>
                    <p className="text-gray-400">{queue?.items.filter((item) => item.status === "queued").length ?? 0} queued · {queue?.running ? "Queue running" : "Queue paused"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" disabled={busy || !queue?.items.some((item) => item.status === "completed")} title="Save completed downloads in queue order as an M3U playlist beside the media files" onClick={() => void createPlaylist()}>Create M3U playlist</Button>
                    <Button variant={queue?.running ? "warning" : "success"} disabled={busy || !queue} onClick={() => void act(queue?.running ? "pause" : "start")}>
                        {queue?.running ? "Pause queue" : "Start queue"}
                    </Button>
                </div>
            </div>
            <p className="text-sm text-gray-400">Shared download list. Add movies or episodes from search. Downloads continue when you close this page. Pausing lets the current download finish.</p>
            {playlistMessage && <p role="status" className="text-sm text-purple-300">{playlistMessage}</p>}
            {error && <p role="alert" className="text-red-400">{error}</p>}
            {!queue && !error && <p>Loading downloads…</p>}
            {queue?.items.length === 0 && <p className="rounded-xl bg-gray-900 p-6">Your download list is empty. Add something from search to get started.</p>}
            {(["downloading", "queued", "failed", "cancelled", "completed"] as const).map((status) => {
                const items = queue?.items.filter((item) => item.status === status) ?? [];
                return items.length > 0 && (
                    <section key={status} className="space-y-3">
                        <h2 className="text-lg font-semibold capitalize">{status === "queued" ? "Waiting" : status}</h2>
                        {items.map((item, index) => (
                            <div key={item.id} className="space-y-3 rounded-xl bg-gray-900 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div><h3 className="font-semibold">{item.entry.name}</h3><p className="text-sm text-gray-400">Added by {item.user}</p></div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.status === "queued" && <>
                                            <Button disabled={busy || index === 0} title="Move this item up to download sooner" aria-label="Move up in download queue" onClick={() => void act("moveUp", item.id)}>↑</Button>
                                            <Button disabled={busy || index === items.length - 1} title="Move this item down to download later" aria-label="Move down in download queue" onClick={() => void act("moveDown", item.id)}>↓</Button>
                                        </>}
                                        {item.status === "downloading" && <Button variant="danger" disabled={busy || item.cancelRequested} onClick={() => void act("cancel", item.id)}>{item.cancelRequested ? "Cancelling…" : "Cancel"}</Button>}
                                        {["failed", "cancelled"].includes(item.status) && <Button variant="important" disabled={busy} onClick={() => void act("retry", item.id)}>Retry</Button>}
                                        {item.status === "completed" && (
                                            <Button
                                                variant="important"
                                                title="Play downloaded file in a new tab"
                                                onClick={() => window.open(`/player?${new URLSearchParams({ streamUrl: `/api/download/queue/${encodeURIComponent(item.id)}/play` })}`, "_blank", "noopener,noreferrer")}
                                            >
                                                ▶️ Play
                                                <span className="sr-only"> (opens in a new tab)</span>
                                            </Button>
                                        )}
                                        {item.status !== "downloading" && <Button variant="danger" disabled={busy} onClick={() => void act("remove", item.id)}>Remove</Button>}
                                        {item.status === "downloading" && <Button variant="secondary" onClick={() => setSelected(selected === item.id ? null : item.id)}>Details</Button>}
                                    </div>
                                </div>
                                {item.status === "downloading" && <div className="space-y-1">
                                    {typeof item.progressPercent === "number" ? <><progress className="h-3 w-full accent-purple-500" max={100} value={item.progressPercent} aria-label={`${item.entry.name} download progress`} /><p className="text-sm">{item.progressPercent.toFixed(1)}%</p></> : <p className="text-sm text-gray-400">Downloading — size unknown</p>}
                                </div>}
                                {item.error && <p className="text-sm text-amber-300">{item.error}</p>}
                            </div>
                        ))}
                    </section>
                );
            })}
            {details?.status === "downloading" && <DownloadMonitor key={details.cacheKey} cacheKey={details.cacheKey} recordingId={details.recordingId} />}
        </main>
    );
}
