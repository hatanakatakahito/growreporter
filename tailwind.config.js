/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3758F9",
          blue: "#3b82f6",    // AI gradient start
          purple: "#8b5cf6",  // AI gradient end
          mid: "#6366f1",     // AI gradient middle
        },
        secondary: {
          DEFAULT: "#13C296",
        },
        stroke: {
          DEFAULT: "#DFE4EA",
        },
        "body-color": "#637381",
        dark: {
          DEFAULT: "#111928",
          2: "#1F2A37",
          3: "#374151",
          4: "#4B5563",
          5: "#6B7280",
          6: "#9CA3AF",
          7: "#D1D5DB",
          8: "#E5E7EB",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      },
    },
  },
  plugins: [],
}

