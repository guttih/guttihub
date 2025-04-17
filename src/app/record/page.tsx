import { Suspense } from "react";
import RecordClient from "./RecordClient";

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading recording form...</div>}>
      <RecordClient />
    </Suspense>
  );
}
