import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-mentions': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    port: 3033,
  },
})
