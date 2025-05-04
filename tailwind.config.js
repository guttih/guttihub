/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    safelist: [
        // ProgressBar color variants
        'bg-gray-500',
        'bg-blue-600',
        'bg-red-600',
        'bg-green-600',
        'bg-gray-400',
        'bg-yellow-600',

        // Stream (sky blue, darker)
        'bg-sky-700',
        'hover:bg-sky-600',
        'ring-sky-500',

        // Record (rose red, darker)
        'bg-rose-700',
        'hover:bg-rose-600',
        'ring-rose-500',

        // Download (purple, darker)
        'bg-purple-700',
        'hover:bg-purple-600',
        'ring-purple-500',
    ],
    plugins: [],
};
