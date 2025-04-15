import React, { useRef, useEffect, useState } from "react";
import { SummaryLabel } from "@/components/SummaryLabel/SummaryLabel";

export interface YearFilterSelectProps {
  years: string[];
  selected: string[];
  onToggle: (year: string) => void;
}

export function YearFilterSelect({
  years,
  selected,
  onToggle,
}: YearFilterSelectProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleAll = (select: boolean) => {
    years.forEach((year) => {
      const isSelected = selected.includes(year);
      if ((select && !isSelected) || (!select && isSelected)) {
        onToggle(year);
      }
    });
  };

  return (
    <div className="relative w-full">
      <details
        ref={ref}
        className="w-full group"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary
  className="h-10 px-3 flex items-center bg-gray-800 text-white border border-gray-700 rounded cursor-pointer group-open:rounded-b-none"
>
  <SummaryLabel
    prefix="Years: "
    defaultLabel="Select year(s)"
    items={selected}
    maxVisible={3}
  />
</summary>
        <div className="absolute bg-gray-900 z-20 border border-gray-700 rounded-t-none rounded-b shadow p-2 w-full max-h-60 overflow-y-auto space-y-1">
          {years.length > 0 && (
            <div className="flex justify-end gap-2 mb-2">
              <button
                type="button"
                className="text-xs text-blue-400 hover:underline"
                onClick={() => toggleAll(true)}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs text-red-400 hover:underline"
                onClick={() => toggleAll(false)}
              >
                Clear all
              </button>
            </div>
          )}
          {years.length === 0 ? (
            <p className="text-gray-500 text-sm px-2 py-1">No years available</p>
          ) : (
            years.map((year) => (
              <label
                key={year}
                className="flex items-center gap-2 text-sm text-white px-2 py-1 hover:bg-gray-700 rounded"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(year)}
                  onChange={() => onToggle(year)}
                />
                {year}
              </label>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
