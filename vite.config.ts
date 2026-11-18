import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pocket-rescue/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 750,
  },
});
