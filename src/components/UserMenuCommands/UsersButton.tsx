// src/components/UserMenuCommands/UsersButton.tsx
"use client";

export const UsersButton = () => {
    const handleClick = () => {
        window.open("/admin/users", "_blank");
    };

    return (
        <button onClick={handleClick} className="w-full text-left px-4 py-2 hover:bg-gray-700">
            🧑‍🤝‍🧑 Users
        </button>
    );
};
