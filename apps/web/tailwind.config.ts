import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        usd: {
          indigo: '#4F46E5',
          blue: '#2563EB',
          purple: '#7C3AED',
          teal: '#059669',
          amber: '#D97706',
          red: '#DC2626',
          coral: '#EA580C',
          green: '#16A34A',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
