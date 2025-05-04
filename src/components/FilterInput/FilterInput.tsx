// src/components/FilterInput/FilterInput.tsx
import React from "react";

export interface FilterInputProps {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;

    mode: {
        isRegex: boolean;
        isCaseSensitive: boolean;
    };
    onToggle: (field: string, key: "isRegex" | "isCaseSensitive") => void;

    loading?: boolean;
    disabled?: boolean;
    className?: string;
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

export function FilterInput({
    name,
    label,
    value,
    onChange,
    mode,
    onToggle,
    loading = false,
    disabled = false,
    className = "",
    onFocus,
    onBlur,
}: FilterInputProps) {
    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center relative w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 focus-within:border-blue-400">
                <input
                    name={name}
                    type="text"
                    placeholder={`Search ${label}`}
                    title={label}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={disabled}
                    className={`flex-1 bg-transparent outline-none border-none text-white placeholder-gray-400 text-sm font-mono pr-2 ${
                        loading ? "text-blue-300" : "text-white"
                    }`}
                />

                <div className="flex gap-1 items-center ml-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => onToggle(name, "isRegex")}
                        className={`text-xs px-1 py-0.5 rounded ${mode.isRegex ? "bg-yellow-600" : "bg-gray-600"} text-white`}
                        title="Toggle regex mode"
                    >
                        .*
                    </button>
                    {!mode.isRegex && (
                        <button
                            type="button"
                            onClick={() => onToggle(name, "isCaseSensitive")}
                            className={`text-xs px-1 py-0.5 rounded ${mode.isCaseSensitive ? "bg-blue-600" : "bg-gray-600"} text-white`}
                            title="Match case"
                        >
                            Aa
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
