import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Setup proxy for local development if you have a real backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
});