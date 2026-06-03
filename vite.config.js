import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'Code'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        format: 'es',
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/zustand')) return 'vendor-state';
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules')) return 'vendor-other';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'Code/src'),
    },
  },
  server: {
    strictPort: false,
  },
  test: {
    environment: 'jsdom',
    root: path.resolve(__dirname, 'Code'),
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
});
