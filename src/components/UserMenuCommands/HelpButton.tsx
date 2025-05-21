// src/components/UserMenuCommands/HelpButton.tsx
"use client";

export const HelpButton = () => {
    const handleClick = () => {
        window.open("/help", "_blank");
    };

    return (
        <button onClick={handleClick} className="w-full text-left px-4 py-2 hover:bg-gray-700">
            🧠 Help & Tips
        </button>
    );
};
