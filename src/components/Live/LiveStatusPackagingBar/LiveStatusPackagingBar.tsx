"use client";

export function LiveStatusPackagingBar() {
    return (
        <div className="relative w-full h-3 bg-gray-700 rounded overflow-hidden">
            <div className="absolute inset-0 animate-pulse bg-blue-400" style={{ width: "100%" }} />
            <div className="text-xs text-center text-gray-200 mt-2">
                Finalizing recording...
            </div>
        </div>
    );
}
