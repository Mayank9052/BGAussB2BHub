import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5173, // React dev server port
    proxy: {
      '/api': {
        target: 'https://localhost:7181', // Your .NET backend URL
        changeOrigin: true,
        secure: false, // self-signed certificates in dev
      },
    },
  },
});