import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/bioassay-LOD-fitter/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-math': ['ml-levenberg-marquardt', 'ml-matrix']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
