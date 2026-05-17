import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-sidebar": "var(--color-bg-sidebar)",
        surface: "var(--color-surface)",
        "surface-sunken": "var(--color-surface-sunken)",
        chrome: "var(--color-chrome)",
        "chrome-elev": "var(--color-chrome-elev)",
        "chrome-sunken": "var(--color-chrome-sunken)",
        "chrome-border": "var(--color-chrome-border)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-faint": "var(--color-text-faint)",
        "text-on-chrome": "var(--color-text-on-chrome)",
        "text-on-chrome-muted": "var(--color-text-on-chrome-muted)",
        "text-on-chrome-faint": "var(--color-text-on-chrome-faint)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-soft": "var(--color-accent-soft)",
        "accent-contrast": "var(--color-accent-contrast)",
        "accent-on-chrome": "var(--color-accent-on-chrome)",
        "accent-2": "var(--color-accent-2)",
        "accent-2-hover": "var(--color-accent-2-hover)",
        "accent-2-soft": "var(--color-accent-2-soft)",
        "accent-2-on-chrome": "var(--color-accent-2-on-chrome)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        ui: ["var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
export default config;
