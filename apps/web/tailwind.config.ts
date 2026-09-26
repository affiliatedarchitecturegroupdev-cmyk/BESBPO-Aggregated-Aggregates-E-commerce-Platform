import type { Config } from "tailwindcss";

// Brand system per the Brand Guidelines: Basalt Black, Limestone White,
// Slate Grey, Seam Blue accent, Ochre Gold reserve accent.
// Typography: Space Grotesk / Inter / IBM Plex Mono.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        basalt: "#1C1B1A",
        limestone: "#F2EFE9",
        slate: "#6B6560",
        "seam-blue": "#2C4A5E",
        "ochre-gold": "#C08A34",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
