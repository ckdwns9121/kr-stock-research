import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        toss: {
          blue: "#3182F6",
          "blue-dark": "#1B64DA",
          red: "#F04452",
          green: "#2AC769",
          gray: {
            50: "#F9FAFB",
            100: "#F2F4F6",
            200: "#E5E8EB",
            300: "#D1D6DB",
            400: "#B0B8C1",
            500: "#8B95A1",
            600: "#6B7684",
            700: "#4E5968",
            800: "#333D4B",
            900: "#191F28",
          },
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Helvetica Neue",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
