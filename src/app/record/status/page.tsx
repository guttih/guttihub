"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusClient from "./StatusClient";
import { useEffect, useState } from "react";
import { RecordingJob } from "@/types/RecordingJob";
import { showMessageBox } from "@/components/ui/MessageBox";

function StatusPageContent() {
    const searchParams = useSearchParams();
    const [cacheKey, setCacheKey] = useState<string | null>(null);
    const [hasShownError, setHasShownError] = useState(false);

    useEffect(() => {
        const key = searchParams?.get("cacheKey") ?? null;

        if (!key && !hasShownError) {
            showMessageBox({
                title: "Missing cacheKey",
                message: "No recording found — check the link and try again.",
                variant: "error",
                displayTime: null,
                blocking: true,
                toast: false,
                position: "center",
                buttonText: "OK"
            }).then(() => {
                // Optional: Redirect the user to a safe fallback page
                // router.push("/schedule");
            });
    
            setHasShownError(true);
            return;
        }
    
        setCacheKey(key);
    }, [searchParams, hasShownError]);
    

    const [job, setJob] = useState<RecordingJob | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cacheKey) return;

        const fetchData = async () => {
            try {
                const jobRes = await fetch(`/api/record/job?cacheKey=${cacheKey}`);
                const jobJson = await jobRes.json();
                console.log(`-> /api/record/job?cacheKey=${cacheKey}`, jobJson);

                if (!jobRes.ok || !jobJson?.cacheKey) throw new Error("Invalid job data");

                setJob(jobJson);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Failed to load recording metadata or time.");
                }
            }
        };

        fetchData();
    }, [cacheKey]);


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
