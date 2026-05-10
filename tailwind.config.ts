import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["NotoSansKR", "Noto Sans KR", "Pretendard", "sans-serif"],
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
