// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  server: {
    port: 3009
  },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()],
  adapter: vercel()
});