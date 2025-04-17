"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  recordingId: string;
  intervalMs?: number;
  autoScroll?: boolean;
}

export function LiveLogViewer({ recordingId, intervalMs = 1000, autoScroll = true }: Props) {
  const [log, setLog] = useState("(fetching log...)");
  const ref = useRef<HTMLPreElement>(null);
  const userScrolledUpRef = useRef(false);
  console.log("LiveLogViewer: working with recordingId:", recordingId);
  useEffect(() => {
    let mounted = true;

    const fetchLog = async () => {
      try {
        const res = await fetch(`/api/recording-log?recordingId=${recordingId}`);
        const json = await res.json();
        if (mounted && json.log) {
          setLog(json.log);
        }
      } catch {
        if (mounted) setLog("(log unavailable)");
      }
    };

    fetchLog(); // initial
    const interval = setInterval(fetchLog, intervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [recordingId, intervalMs]);

  useEffect(() => {
    if (autoScroll && ref.current && !userScrolledUpRef.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [log, autoScroll]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    userScrolledUpRef.current = !isAtBottom;
  };

  return (
    <pre
      ref={ref}
      onScroll={handleScroll}
      className="bg-gray-900 p-4 rounded text-xs overflow-auto max-h-[300px] border border-gray-700"
    >
      {log}
    </pre>
  );
}
