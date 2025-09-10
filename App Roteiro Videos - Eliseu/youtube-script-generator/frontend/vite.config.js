import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/scriptai-[hash].js',
        chunkFileNames: 'assets/scriptai-chunk-[hash].js',
        assetFileNames: 'assets/scriptai-[hash].[ext]'
      }
    }
  }
})
