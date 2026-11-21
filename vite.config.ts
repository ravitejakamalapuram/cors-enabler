import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    crx({
      manifest,
      // Build the page indicator as a self-contained IIFE. The default loader
      // would list its chunks in web_accessible_resources for <all_urls>,
      // which lets any website detect the extension.
      contentScripts: { standaloneFiles: ['src/content/page-indicator.ts'] },
    }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },
});
