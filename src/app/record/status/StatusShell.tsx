"use client";

import StatusLoader from "./StatusLoader";

interface Props {
  searchParams: Record<string, string>;
}

export default function StatusShell({ searchParams }: Props) {
  const recordingId = searchParams.recordingId ?? null;

  console.log("🎯 StatusShell sees recordingId:", recordingId);

  return <StatusLoader recordingId={recordingId} />;
}
