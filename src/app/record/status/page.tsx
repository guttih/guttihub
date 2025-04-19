"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusClient from "./StatusClient";
import { useEffect, useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";

function StatusPageContent() {
    const searchParams = useSearchParams();
    const recordingId = searchParams.get("recordingId");

    const [job, setJob] = useState<RecordingJob | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!recordingId) {
            setError("Missing recording ID in URL");
            return;
        }

        const fetchData = async () => {
            try {
                const jobRes = await fetch(`/api/record/job?recordingId=${recordingId}`);

                const jobJson = await jobRes.json();

                if (!jobRes.ok || !jobJson?.recordingId) throw new Error("Invalid job data");

                setJob(jobJson);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    console.error("❌ Failed to load:", err.message);
                    setError(err.message);
                } else {
                    console.error("❌ Failed to load job or time:", err);
                    setError("Failed to load recording metadata or time.");
                }
            }
        };

        fetchData();
    }, [recordingId]);

    if (error) return <div className="p-6 text-red-400">{error}</div>;
    if (!job) return <div className="p-6 text-gray-400">Loading recording job info...</div>;

    return <StatusClient job={job} />;
}

export default function StatusPage() {
    return (
        <Suspense fallback={<div className="p-6 text-gray-400">Loading page...</div>}>
            <StatusPageContent />
        </Suspense>
    );
}
