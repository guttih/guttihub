// src/components/UserMenuCommands/ProfileButton.tsx
"use client";

export const ProfileButton = () => {
    const handleClick = () => {
        window.open("/profile", "_blank");
    };

    return (
        <button onClick={handleClick} className="w-full text-left px-4 py-2 hover:bg-gray-700">
            🧑‍🤝‍🧑 Profile
        </button>
    );
};
