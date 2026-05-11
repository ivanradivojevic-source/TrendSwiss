import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'swiss-red': '#dc2626',
        'swiss-black': '#111827',
        'swiss-gold': '#d97706',
      },
    },
  },
  plugins: [],
};
export default config;
