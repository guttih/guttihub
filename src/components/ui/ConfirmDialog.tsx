import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  withAnimation?: boolean;
}

export function confirmDialog(rawOptions: ConfirmDialogOptions): Promise<boolean> {
  const options = {
    confirmText: "Confirm",
    cancelText: "Cancel",
    withAnimation: true,
    ...rawOptions,
  };

  const { title, message, confirmText, cancelText, withAnimation } = options;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);

  return new Promise<boolean>((resolve) => {
    const ConfirmComponent = () => {
      const [shouldAnimate, setShouldAnimate] = useState(false);
      const [isClosing, setIsClosing] = useState(false);

      useEffect(() => {
        const frame = requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
        return () => cancelAnimationFrame(frame);
      }, []);

      useEffect(() => {
        if (isClosing) {
          const timeout = setTimeout(() => {
            root.unmount();
            container.remove();
          }, 200);
          return () => clearTimeout(timeout);
        }
      }, [isClosing]);

      const handleConfirm = () => {
        setIsClosing(true);
        setTimeout(() => resolve(true), 200);
      };

      const handleCancel = () => {
        setIsClosing(true);
        setTimeout(() => resolve(false), 200);
      };

      return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className={`
            absolute inset-0 bg-black/60 transition-opacity duration-200
            ${withAnimation ? (shouldAnimate && !isClosing ? "opacity-100" : "opacity-0") : ""}
          `} />

          {/* Dialog panel */}
          <div className={`
            relative z-10 bg-gray-900 text-white p-6 rounded-xl shadow-lg max-w-sm w-full space-y-4
            transform transition-all duration-200
            ${withAnimation ? (shouldAnimate && !isClosing ? "opacity-100 scale-100" : "opacity-0 scale-95") : ""}
          `}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-gray-400">{message}</p>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-500"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>,
        container
      );
    };

    root.render(<ConfirmComponent />);
  });
}
