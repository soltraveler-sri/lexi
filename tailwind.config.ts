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
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-faint": "var(--color-text-faint)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-soft": "var(--color-accent-soft)",
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
