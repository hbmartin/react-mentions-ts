import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // eslint-disable-next-line code-complete/enforce-meaningful-names
  experimentalDts: true,
  sourcemap: true,
  outDir: 'dist',
  target: 'es2023',
  platform: 'neutral',
  clean: true,
  treeshake: true,
  minify: false,
  splitting: false,
  metafile: false,
  deps: {
    neverBundle: ['react', 'react-dom'],
  },
  dts: false,
})
