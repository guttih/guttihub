import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let color = "bg-gray-500"; // Default: unknown

  if (status === "recording") color = "bg-green-500";
  else if (status === "packaging") color = "bg-yellow-500";
  else if (status === "done") color = "bg-blue-500";
  else if (status === "stopped") color = "bg-indigo-500";
  else if (status === "error") color = "bg-red-600";

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-semibold ${color}`}>
      {status}
    </span>
  );
};
