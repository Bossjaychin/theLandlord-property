import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiMiddleware } from './src/lib/apiServer.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dataconnect-forensics-api',
      configureServer(server) {
        server.middlewares.use(apiMiddleware);
      }
    }
  ],
})
