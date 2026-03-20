import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5181',
        changeOrigin: true,
        secure: false,
      },

      // ✅ ADD THIS BLOCK (VERY IMPORTANT)
      '/ScootyInventoryImage': {
        target: 'http://localhost:5181',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});