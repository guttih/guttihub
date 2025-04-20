//src/app/schedule/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Job = { id: string; datetime: string; description: string; command: string };

export default function SchedulePage() {
    /* ---------------- form state ---------------- */
    const [datetime, setDatetime] = useState(() => {
        // HTML <input type="datetime‑local"> expects YYYY‑MM‑DDTHH:MM
        const t = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
        return t.toISOString().slice(0, 16);
    });
    const [desc, setDesc] = useState("");
    const [cmd, setCmd] = useState("");
    const [error, setError] = useState<string | null>(null);

    /* ---------------- list state ---------------- */
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const nextRefresh = useRef<NodeJS.Timeout | null>(null);

    // live clock (updates every 1 s)
    const [now, setNow] = useState<Date>(new Date());

    function scheduleNextAutoReload(jobs: Job[]) {
        // clear any previous timeout
        if (nextRefresh.current) clearTimeout(nextRefresh.current);

        if (jobs.length === 0) return; // nothing scheduled

        const soonest = Math.min(...jobs.map((j) => new Date(j.datetime).getTime()));

        const ms = soonest - Date.now() + 5_000; // 5 s grace
        if (ms > 0 && ms < 24 * 60 * 60 * 1000) {
            // don’t queue absurd delays
            nextRefresh.current = setTimeout(() => reload(), ms);
        }
    }

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1_000);
        return () => clearInterval(id); // tidy up on unmount
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        const r = await fetch("/api/schedule");
        const j = await r.json();
        setLoading(false);
      
        if (!j.ok) return setError(j.error ?? "load error");
        setJobs(j.jobs);
        scheduleNextAutoReload(j.jobs);
      }, []);            //  ←  nothing inside changes between renders
      
      /* then update the effect */
      useEffect(() => { reload(); }, [reload]);

    useEffect(() => {
        return () => {
            // cleanup on unmount
            if (nextRefresh.current) clearTimeout(nextRefresh.current);
        };
    }, []);

    /* ---------------- add ----------------------- */
    async function add(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const r = await fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ datetime, desc, cmd }),
        });
        const j = await r.json();
        if (!j.ok) return setError(j.error);
        setDatetime("");
        setDesc("");
        setCmd("");
        reload();
    }

    /* ---------------- delete -------------------- */
    async function del(id: string) {
        if (!confirm(`Delete job ${id}?`)) return;
        const r = await fetch("/api/schedule", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        const j = await r.json();
        if (!j.ok) return alert(j.error);
        reload();
    }

    return (
        <div className="mx-auto max-w-3xl p-6 space-y-8">
            {/* --- header row --------------------------------------------------- */}
            <div className="flex items-center justify-between mb-6">
                {/* title */}
                <h1 className="text-3xl font-bold text-white">Scheduler</h1>

                {/* live clock */}
                <span
                    className="inline-flex items-center gap-2 bg-gray-800 text-gray-300 font-mono 
               px-3 py-1 rounded-full shadow-sm ring-1 ring-gray-700 select-none"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2 2m8-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                    {now.toLocaleString()}
                </span>
            </div>

            {/* === Add form === */}
            <form onSubmit={add} className="space-y-3">
                <input
                    type="datetime-local"
                    className="w-full p-2 border rounded"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    required
                />

                <input
                    type="text"
                    placeholder="Description"
                    className="w-full p-2 border rounded"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    required
                />

                <textarea
                    placeholder="Command…"
                    rows={3}
                    className="w-full p-2 border rounded font-mono"
                    value={cmd}
                    onChange={(e) => setCmd(e.target.value)}
                    required
                />

                {error && <p className="text-red-600">{error}</p>}

                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Schedule</button>
            </form>

            {/* === List === */}
            {loading ? (
                <p>Loading…</p>
            ) : jobs.length === 0 ? (
                <p>No jobs yet.</p>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="text-left border-b">
                            <th className="p-2">ID</th>
                            <th className="p-2">When</th>
                            <th className="p-2">Description</th>
                            <th className="p-2">Command</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((j) => (
                            <tr key={j.id} className="border-b">
                                <td className="p-2">{j.id}</td>
                                <td className="p-2 whitespace-nowrap">{j.datetime}</td>
                                <td className="p-2">{j.description}</td>
                                <td className="p-2 font-mono truncate max-w-xs">{j.command}</td>
                                <td className="p-2">
                                    <button onClick={() => del(j.id)} className="text-red-600 hover:underline">
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Link href="/record" className="underline text-sm">
                ← back to Record home
            </Link>
        </div>
    );
}
