"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  title?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string; // e.g. "max-w-lg"
};

export default function Modal({ title, open, onClose, children, footer, widthClassName = "max-w-xl" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const container = useMemo(() => {
    if (typeof document === "undefined") return null as HTMLDivElement | null;
    const el = document.createElement("div");
    return el;
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!container) return;
    document.body.appendChild(container);
    return () => {
      try {
        document.body.removeChild(container);
      } catch {
        /* ignore */
      }
    };
  }, [container]);

  if (!mounted || !container) return null;

  return createPortal(
    open ? (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className={`relative z-10 w-full ${widthClassName} mx-4 rounded-xl border border-gray-700 bg-gray-900 text-white shadow-2xl`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white">×</button>
          </div>
          <div className="p-5">{children}</div>
          {footer ? (
            <div className="px-5 py-4 border-t border-gray-700 bg-black/20 rounded-b-xl">{footer}</div>
          ) : null}
        </div>
      </div>
    ) : null,
    container
  );
}
