import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        zen: ["\"Zen Serif\"", "serif"],
      },
      colors: {
        ink: "#1e1e1e",
        line: "#e9e9e9",
      },
    },
  },
  plugins: [],
};

export default config;
