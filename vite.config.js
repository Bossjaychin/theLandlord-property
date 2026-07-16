import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (
            id.includes('node_modules/genkit') ||
            id.includes('node_modules/@genkit-ai')
          ) {
            return 'vendor-genkit';
          }
        },
      },
    },
    // Raise the warning threshold slightly — we've already chunked aggressively
    chunkSizeWarningLimit: 600,
  },
})
