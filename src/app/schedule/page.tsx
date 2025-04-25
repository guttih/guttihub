// src/app/schedule/page.tsx
"use client";

import { useState, useEffect } from "react";
import { EnrichedScheduledJobCard } from "@/components/cards/EnrichedScheduledJobCard/EnrichedScheduledJobCard";
import { JobctlEnrichedScheduledJob } from "@/types/JobctlEnrichedScheduledJob";
import Link from "next/link";
import { confirmDialog  } from "@/components/ui/ConfirmDialog";

export default function SchedulePage() {
    const [jobs, setJobs] = useState<JobctlEnrichedScheduledJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch("/api/schedule/enriched")
            .then((res) => res.json())
            .then((data) => {
                if (!data.ok) throw new Error(data.error || "Unknown error");
                setJobs(data.enrichedJobs);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (systemJobId: string) => {
        if (! await confirmDialog ({
            title: "Delete Job",
            message: "Are you sure you want remove this scheduled recording ?",
            confirmText: "Delete",
            cancelText: "Cancel",
        })) return;

        const res = await fetch("/api/schedule", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ systemJobId }),
        });
        const data = await res.json();
        if (!data.ok) return alert(data.error || "Failed to delete job");
        setJobs((prev) => prev.filter((job) => job.systemJobId !== systemJobId));
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Scheduled Jobs</h1>
                <span className="font-mono text-sm bg-gray-800 text-gray-300 px-3 py-1 rounded shadow-sm ring-1 ring-gray-700">
                    {now.toLocaleString(undefined, { hour12: false })}
                </span>
            </div>

            {loading ? (
                <p className="text-gray-400">Loading jobs…</p>
            ) : error ? (
                <p className="text-red-400">❌ {error}</p>
            ) : jobs.length === 0 ? (
                <p className="text-gray-500">No scheduled jobs found.</p>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job) => (
                        <EnrichedScheduledJobCard key={job.systemJobId} job={job} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Link href="/record" className="underline text-sm block pt-4">
                ← Back to Record
            </Link>

        </div>
    );
}
