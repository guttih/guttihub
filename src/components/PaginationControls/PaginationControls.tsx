import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
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
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageChange(Number(e.target.value));
  };

  return (
    <div className={`flex flex-wrap gap-4 items-center justify-between my-4 opacity-70 ${className}`}>

      {/* Left side: First / Prev buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={buttonClassName}
            title="First page"
        >
          ⏮
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={buttonClassName}
          title="Previous page"
        >
          ←
        </button>
      </div>

      {/* Center: Info & select */}
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>
          Page{" "}
          <select
            value={currentPage}
            onChange={handleSelectChange}
            className="bg-gray-800 text-white px-2 py-1 rounded"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>{" "}
          of {totalPages}
        </span>
        <span>• {totalEntries} result{totalEntries === 1 ? "" : "s"}</span>
      </div>

      {/* Right side: Next / Last buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={buttonClassName}
          title="Next page"
        >
          →
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={buttonClassName}
          title="Last page"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}
