/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'SF Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        // Dynamic theme using CSS variables
        sandoro: {
          bg: 'var(--sandoro-bg)',
          fg: 'var(--sandoro-fg)',
          primary: 'var(--sandoro-primary)',
          secondary: 'var(--sandoro-secondary)',
          accent: 'var(--sandoro-accent)',
          work: 'var(--sandoro-work)',
          'short-break': 'var(--sandoro-short-break)',
          'long-break': 'var(--sandoro-long-break)',
        },
        // Nord theme
        nord: {
          bg: '#2e3440',
          fg: '#eceff4',
          primary: '#88c0d0',
          secondary: '#4c566a',
          accent: '#ebcb8b',
          work: '#a3be8c',
          'short-break': '#88c0d0',
          'long-break': '#81a1c1',
        },
        // Dracula theme
        dracula: {
          bg: '#282a36',
          fg: '#f8f8f2',
          primary: '#bd93f9',
          secondary: '#44475a',
          accent: '#ff79c6',
          work: '#50fa7b',
          'short-break': '#8be9fd',
          'long-break': '#bd93f9',
        },
      },
    },
  },
  plugins: [],
};
