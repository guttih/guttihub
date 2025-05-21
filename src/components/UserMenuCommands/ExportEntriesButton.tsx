"use client";

type Props = {
  onExport: () => void;
  disabled?: boolean;
};

export const ExportEntriesButton = ({ onExport, disabled = false }: Props) => {
  return (
    <button
      onClick={onExport}
      disabled={disabled}
      title="Download filtered entries as .m3u playlist"
      className="w-full text-left px-4 py-2 hover:bg-gray-700 disabled:opacity-40 flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
        />
      </svg>
      <span>Export</span>
    </button>
  );
};
