import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        // Main backgrounds
        background: '#F5F7FA', // Soft light gray
        sidebar: {
          DEFAULT: '#1F2937', // Nearly-black
          foreground: '#FFFFFF',
          accent: '#4F46E5', // Indigo for sidebar accents
        },
        // Main accent blues and purples
        primary: {
          DEFAULT: '#1E3A8A', // Deep blue
          dark: '#153174',    // Darker shade for hover
          foreground: '#FFFFFF'
        },
        fuchsia: {
          DEFAULT: '#6D28D9', // Purple accent
          dark: '#5B21B6'
        },
        // Statuses
        success: '#22c55e',
        warning: '#f59e42',
        error: '#ef4444',
        // Table row
        rowAlt: '#F1F5F9',
        cardAccent: {
          blue: '#1E3A8A',
          green: '#22c55e',
          purple: '#6D28D9',
          red: '#ef4444',
        }
      },
      borderRadius: {
        xl: '1.25rem',
        lg: '0.5rem',
        md: '0.375rem',
        base: '0.25rem',
        sm: '0.125rem',
        '8': '8px',
      },
      boxShadow: {
        card: '0 3px 16px 0 rgba(30,58,138,0.06), 0 1.5px 4px 0 rgba(93,93,186,0.05)',
        'card-hover': '0 6px 32px 0 rgba(34, 197, 94,0.07), 0 2px 8px 0 rgba(0,0,0,0.05)'
      },
      transitionProperty: {
        'color-bg': 'color, background-color, border-color'
      },
      keyframes: {
        'card-pop': {
          '0%': { transform: 'scale(0.97)', opacity: 0.7 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        }
      },
      animation: {
        'card-pop': 'card-pop 0.25s cubic-bezier(0.22,1,0.36,1)'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
