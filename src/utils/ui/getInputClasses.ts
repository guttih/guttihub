export function getInputClasses(loading: boolean, value: string): string {
    const hasValue = value.length > 0;
    return `flex-1 min-w-[150px] px-3 py-2 border rounded font-mono
        ${loading ? "text-blue-300" : "text-white"}
        ${hasValue ? "border-blue-400 bg-gray-700" : "border-gray-600 bg-gray-800"}`;
}
