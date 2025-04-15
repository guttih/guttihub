import React from "react";

export interface SpinnerProps {
  variant?: "classic" | "overlay";
}

export const Spinner: React.FC<SpinnerProps> = ({ variant = "overlay" }) => {
  if (variant === "classic") {
    return (
      <div
        className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"
        title="Loading..."
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Transparent dark backdrop */}
      <div className="absolute inset-0 bg-black/10" />
      {/* Glowy spinner */}
      <div
        className="z-10 animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)]"
        title="Loading..."
      />
    </div>
  );
};
