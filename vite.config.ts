import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js lives in its own lazy chunk; it is only fetched for the 3D view.
    chunkSizeWarningLimit: 1200,
  },
})
