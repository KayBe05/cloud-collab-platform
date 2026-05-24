/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // ── CloudX Color Palette ──────────────────────────────────
      colors: {
        cx: {
          0: "#050b14",
          1: "#111e2e",
          2: "#0c1624",
          3: "#10202f",
          4: "#172840",
        },
        "ai-bg": "#080f1c",
        "ai-cyan": "#00ccff",

        // Text hierarchy
        "cx-t1": "#dbeaff",
        "cx-t2": "#7b9db8",
        "cx-t3": "#3d5870",

        // Accent palette
        "cx-green": "#00e87a",
        "cx-purple": "#9d6fff",
        "cx-yellow": "#f5c842",
        "cx-orange": "#ff7c42",
        "cx-red": "#ff4455",

        // Semantic
        primary: "#0ea5e9",
        secondary: "#06b6d4",
        accent: "#8b5cf6",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",

        // Gray scale (kept for utility)
        gray: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },

      // ── Typography ────────────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Syne", "sans-serif"],
        mono: ["JetBrains Mono", "DM Mono", "monospace"],
      },

      // ── Spacing / Layout ──────────────────────────────────────
      spacing: {
        "sidebar": "280px",
        "header": "70px",
      },

      // ── Border Radius ─────────────────────────────────────────
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },

      // ── Box Shadow ────────────────────────────────────────────
      boxShadow: {
        "cx-card": "0 8px 32px rgba(0,0,0,0.2)",
        "cx-card-lg": "0 16px 48px rgba(0,0,0,0.3)",
        "cx-glow": "0 0 24px rgba(0,204,255,0.30), 0 0 48px rgba(0,204,255,0.12)",
        "cx-green": "0 0 20px rgba(0,232,122,0.28)",
        "cx-red": "0 0 20px rgba(255,68,85,0.30)",
        "cx-purple": "0 0 24px rgba(157,111,255,0.28)",
        "cx-sidebar": "-12px 0 48px rgba(0,0,0,0.55)",
      },

      // ── Backdrop Blur ─────────────────────────────────────────
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "20px",
      },

      // ── Transitions ───────────────────────────────────────────
      transitionTimingFunction: {
        "cx-spring": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },

      // ── Background Images ─────────────────────────────────────
      backgroundImage: {
        "cx-grid":
          "linear-gradient(rgba(0,204,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,255,0.06) 1px, transparent 1px)",
        "cx-hero":
          "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(2,132,199,0.4) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(14,165,233,0.21) 0%, transparent 60%)",
        "cx-sidebar-edge":
          "linear-gradient(to bottom, transparent 0%, #00ccff 30%, #9d6fff 70%, transparent 100%)",
        "ai-fab":
          "linear-gradient(135deg, #00e87a 0%, #9d6fff 100%)",
      },

      // ── Animations ────────────────────────────────────────────
      keyframes: {
        "cx-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "cx-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "cx-bounce-dot": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "50%": { transform: "translateY(-5px)", opacity: "1" },
        },
        "cx-msg-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "cx-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "cx-fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "cx-slide-in": {
          from: { opacity: "0", transform: "translateX(110%) scale(0.92)" },
          to: { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        "cx-badge-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.82)" },
        },
        "cx-data-flow": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "cx-blink": "cx-blink 2s ease-in-out infinite",
        "cx-spin": "cx-spin 0.7s linear infinite",
        "cx-bounce-dot": "cx-bounce-dot 1.2s ease-in-out infinite",
        "cx-msg-in": "cx-msg-in 0.28s ease-out both",
        "cx-float": "cx-float 4s ease-in-out infinite",
        "cx-fade-up": "cx-fade-up 0.5s ease-out forwards",
        "cx-slide-in": "cx-slide-in 0.38s cubic-bezier(0.16,1,0.3,1) both",
        "cx-badge-pulse": "cx-badge-pulse 2.2s ease-in-out infinite",
        "cx-data-flow": "cx-data-flow 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};