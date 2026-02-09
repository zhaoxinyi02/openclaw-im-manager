import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:6199',
      '/ws': {
        target: 'ws://localhost:6199',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
