"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import StatusClient from "./StatusClient";
import { RecordingJob } from "@/types/RecordingJob";

export default function StatusPage() {
  const searchParams = useSearchParams();
  const recordingId = searchParams.get("recordingId");

  const [job, setJob] = useState<RecordingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingId) {
      setError("Missing recordingId in URL");
      return;
    }

    const fetchJob = async () => {
      try {
        console.log("🛰 Fetching job using recordingId:", recordingId);
        const res = await fetch(`/api/recording-job?recordingId=${recordingId}`)

        const json = await res.json();

        if (!res.ok || !json || !json.recordingId) {
          throw new Error("Invalid job data");
        }

        setJob(json);
      } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("❌ Failed to load job:", err.message);
            setError(err.message);
            }
        else {
            console.error("❌ Failed to load job:", err);
            setError("Failed to load recording metadata.");
        }
      }
    };

    fetchJob();
  }, [recordingId]);

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!job) return <div className="p-6 text-gray-400">Loading recording job info...</div>;

  return <StatusClient job={job} />;
}


  
// "use client";

// import { useSearchParams } from "next/navigation";
// import { LiveStatusViewer } from "@/components/LiveStatusViewer/LiveStatusViewer";
// import { LiveLogViewer } from "@/components/LiveLogViewer/LiveLogViewer";

// export default function StatusPage() {
//     const searchParams = useSearchParams();
//     const recordingId = searchParams.get("recordingId");

//     console.log("📡 StatusPage loaded with recordingId:", recordingId);

//     if (!recordingId) {
//         return <div className="p-6 text-red-400">❌ Missing recording ID in URL</div>;
//     }

//     return (
//         <div className="p-6 space-y-6">
//             <LiveStatusViewer recordingId={recordingId} />
//             <div>
//                 <h3 className="text-sm text-gray-300 font-semibold mb-2">Live Recording Log</h3>
//                 <LiveLogViewer recordingId={recordingId} />
//             </div>
//         </div>
//     );
// }
