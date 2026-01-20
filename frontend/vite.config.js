// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy API requests to your backend
      '/api': {
        target: 'http://fastapi_app:8000', // Change this to your FastAPI server URL
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '') // Remove /api prefix
      }
    }
  },
  // css: {
  //   postcss: './postcss.config.js', // or './postcss.config.cjs'
  // }
})