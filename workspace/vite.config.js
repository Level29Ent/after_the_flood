import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/examples/')) return 'three-addons';
          if (id.includes('/node_modules/three/')) return 'three-core';
          if (id.includes('/node_modules/@supabase/')) return 'multiplayer';
        },
      },
    },
  },
});
