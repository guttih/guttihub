import { Suspense } from "react";
import StatusLoader from "./StatusLoader";

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading recording status...</div>}>
      <StatusLoader />
    </Suspense>
  );
}
