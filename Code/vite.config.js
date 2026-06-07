import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-web',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-lucide': ['lucide-react'],
          'vendor-wavesurfer': ['wavesurfer.js'],
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
  server: {
    port: 5173,
  },
});
