"use client";

export const ScheduleButton = () => {
  const handleClick = async () => {
        window.open("/schedule", "_blank")
  };

  return (
    <button 
        onClick={handleClick} 
        title="Shows the recordings scheduled to start in the future."
        className="w-full text-left px-4 py-2 hover:bg-gray-700">
      📖 Scheduled recordings
    </button>
  );
};
