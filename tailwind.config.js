/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}", // adjust if your structure is different
    ],
    theme: {
      extend: {},
    },
    safelist: [
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
  