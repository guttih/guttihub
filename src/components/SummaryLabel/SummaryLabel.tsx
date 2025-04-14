// components/ui/SummaryLabel.tsx
import React from "react";

export interface SummaryLabelProps {
  prefix?: string; // e.g., "Years:"
  items: string[];
  maxVisible?: number;
  defaultLabel?: string;
  className?: string;
}

export function SummaryLabel({
  prefix = "",
  items,
  maxVisible = 5,
  defaultLabel = "Select items",
  className = "",
}: SummaryLabelProps) {
  const visibleItems = items.slice(0, maxVisible);
  const hiddenCount = items.length - visibleItems.length;
  const preview = visibleItems.join(", ");
  const label =
    items.length === 0
      ? defaultLabel
      : `${prefix}${preview}${hiddenCount > 0 ? ", ..." : ""}`;

  return (
    <span
      className={`truncate inline-block w-full text-left ${className}`}
      title={items.join(", ")}
    >
      {label}
    </span>
  );
}
