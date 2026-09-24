import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

// Primary / accent are driven by CSS variables (see globals.css) so the
// public site can wear a seasonal palette while the admin area stays
// neutral via the `.theme-admin` wrapper. Values are RGB triplets so
// Tailwind opacity modifiers (bg-primary-600/20) keep working.
const scale = (name: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [
      step,
      `rgb(var(--${name}-${step}) / <alpha-value>)`,
    ]),
  );

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: scale('primary'),
        accent: scale('accent'),
        // Warm neutrals: `gray-*` utilities resolve to Tailwind's stone scale
        // so cards, borders and body text pick up a subtle warmth.
        gray: colors.stone,
        // Fixed seasonal tones for the public site
        paper: '#fdf9f3',   // cream page background
        bark: '#2b1a12',    // deep brown footer
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        warm: '0 1px 2px rgb(107 41 20 / 0.06), 0 8px 24px -12px rgb(107 41 20 / 0.25)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

export default config;
