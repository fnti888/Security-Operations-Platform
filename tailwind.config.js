/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cyber-bg': 'var(--cyber-bg)',
        'cyber-primary': 'var(--cyber-primary)',
        'cyber-secondary': 'var(--cyber-secondary)',
        'cyber-accent': 'var(--cyber-accent)',
      },
    },
  },
  plugins: [],
};
