import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const gameServerTarget = process.env.GAME_SERVER_HTTP ?? 'http://127.0.0.1:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: gameServerTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: gameServerTarget.replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
  build: {
    target: 'safari16',
    sourcemap: false,
  },
});
