import React from "react";
import { getInputClasses } from "@/utils/ui/getInputClasses";

export interface FilterInputProps {
    name: string; // e.g. "searchName"
    label: string; // e.g. "Name"
    value: string;
    onChange: (value: string) => void;

    mode: {
        isRegex: boolean;
        isCaseSensitive: boolean;
    };
    onToggle: (field: string, key: "isRegex" | "isCaseSensitive") => void;
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;

    loading?: boolean;
    disabled?: boolean;

    className?: string;
}

export function FilterInput({ name, label, value, onChange, mode, onToggle, loading = false, disabled = false, className = "" }: FilterInputProps) {
    return (
        <div className={`relative ${className}`}>
            <input
                name={name}
                type="text"
                placeholder={`Search ${label}`}
                title={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={getInputClasses(loading, value)}
            />
            <div className="absolute top-1 right-1 flex gap-1">
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
    );
}
