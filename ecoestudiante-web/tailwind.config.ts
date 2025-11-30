import type { Config } from 'tailwindcss';
import { nextui } from '@nextui-org/react';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#10b981',
              foreground: '#ffffff',
            },
            secondary: {
              DEFAULT: '#3b82f6',
              foreground: '#ffffff',
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: '#34d399',
              foreground: '#000000',
            },
            background: '#0a0a0a',
            foreground: '#ededed',
          },
        },
      },
    }),
  ],
};

export default config;
