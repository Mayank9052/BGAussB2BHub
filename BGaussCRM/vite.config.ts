import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
server: {
  host: true,
  port: 5173,
  open: "http://192.168.68.56:5173",
  proxy: {
    '/api': {
      target: 'http://192.168.68.56:5181',
      changeOrigin: true,
      secure: false,
    },
  },
},
});