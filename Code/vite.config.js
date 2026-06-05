import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
