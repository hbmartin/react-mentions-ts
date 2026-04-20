import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // eslint-disable-next-line code-complete/enforce-meaningful-names
  dts: true,
  sourcemap: false,
  outDir: 'dist',
  target: 'es2023',
  platform: 'neutral',
  clean: true,
  treeshake: true,
  minify: true,
  deps: {
    neverBundle: ['react', 'react-dom'],
  },
})
