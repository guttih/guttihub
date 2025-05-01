// src/components/ProgressBarPercent/ProgressBarPercent.tsx
"use client";

interface ProgressBarPercentProps {
  percent: number;
  showLabel?: boolean;
  variant?: "default" | "danger" | "warning" | "important" | "success" | "secondary";
  className?: string;
}

const variantMap = {
  default: "bg-gray-500",
  important: "bg-blue-600",
  danger: "bg-red-600",
  success: "bg-green-600",
  secondary: "bg-gray-400",
  warning: "bg-yellow-600",
};

export default function ProgressBarPercent({
  percent,
  showLabel = true,
  variant = "default",
  className = "",
}: ProgressBarPercentProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barColor = variantMap[variant] || variantMap.default;

  return (
    <div className={`relative mt-3 h-3 rounded bg-gray-700 overflow-hidden ${className}`}>
      <div
        className={`${barColor} h-full transition-all duration-300 ease-linear`}
        style={{ width: `${clamped}%` }}
      />
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono">
          {clamped.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
