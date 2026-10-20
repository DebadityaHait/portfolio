import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({
  plugins: [react(), cloudflare({ viteEnvironment: { name: 'worker' } })],
  environments: {
    client: {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              motion: ['motion/react'],
              sketch: ['roughjs'],
              react: ['react', 'react-dom/client'],
            },
          },
        },
      },
    },
  },
});
