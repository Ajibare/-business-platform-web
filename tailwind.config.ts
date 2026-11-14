import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F3F6',
          600: '#0B6E80',
          700: '#095868',
        },
        success: {
          DEFAULT: '#1E7B4F',
          soft: '#E3F4EA',
        },
        warning: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#B42318',
          soft: '#FEE4E2',
        },
        info: {
          DEFAULT: '#1D5FBF',
          soft: '#E3EDFB',
        },
        discrepancy: {
          DEFAULT: '#6D3FC0',
          soft: '#EEE8FA',
        },
        neutral: {
          DEFAULT: '#5B6770',
          soft: '#E9EDF0',
        },
        ink: '#14212B',
        slate: '#475569',
        border: '#CBD5DC',
        background: '#F5F7FA',
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 33, 43, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
