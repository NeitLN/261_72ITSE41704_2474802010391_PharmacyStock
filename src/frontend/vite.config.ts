import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    // Declared empty on purpose: without it Vite searches parent directories
    // for a PostCSS config and can pick up an unrelated one from the
    // developer's home folder. This project uses Ant Design, not PostCSS.
    postcss: {},
  },
  server: {
    port: 5173,
  },
});
