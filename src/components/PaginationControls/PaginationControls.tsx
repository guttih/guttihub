import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  onPageChange: (delta: number) => void;
  className?: string;
  buttonClassName?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalEntries,
  onPageChange,
  className = "",
  buttonClassName = "text-sm px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50",
}: PaginationControlsProps) {
  return (
    <div className={`flex justify-between items-center my-4 ${className}`}>
      <button
        onClick={() => onPageChange(-1)}
        disabled={currentPage === 1}
        className={buttonClassName}
      >
        ← Previous
      </button>
      <span className="text-xs text-gray-400">
        Page {currentPage} of {totalPages} — {totalEntries} result
        {totalEntries === 1 ? "" : "s"}
      </span>
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === totalPages}
        className={buttonClassName}
      >
        Next →
      </button>
    </div>
  );
}
