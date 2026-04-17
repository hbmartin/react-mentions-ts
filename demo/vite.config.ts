import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const WDYR_FLAG = String(process.env.VITE_WDYR ?? '').toLowerCase()
const enableWhyDidYouRender = WDYR_FLAG === 'true' || WDYR_FLAG === '1'
const WDYR_IMPORT_SOURCE = '@welldone-software/why-did-you-render'

export default defineConfig({
  root: __dirname,
  build: {
    sourcemap: true,
  },
  plugins: [
    react({
      ...(enableWhyDidYouRender && {
        jsxImportSource: WDYR_IMPORT_SOURCE,
      }),
    }),
  ],
  ...(enableWhyDidYouRender && {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: WDYR_IMPORT_SOURCE,
    },
  }),
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react-mentions': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    port: 3033,
  },
})
