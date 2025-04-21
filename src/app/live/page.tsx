import { Suspense } from "react";
import LiveClient from "./LiveClient";

export default function LivePage() {
  return (
    <Suspense fallback={<div className="p-4 text-white">Loading live player...</div>}>
      <LiveClient />
    </Suspense>
  );
}
