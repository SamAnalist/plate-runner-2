import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Bind to all network interfaces (not just localhost) so the dev server is
  // reachable from other devices on the LAN — mirrors apps/server's unconditional
  // 0.0.0.0 bind. See docs/MANUAL_TESTING_GUIDE.md's Real LAN Testing section.
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@plate-runner/shared': path.resolve(
        __dirname,
        '../../packages/shared/src/index.ts',
      ),
    },
  },
});
