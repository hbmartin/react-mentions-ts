import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	outDir: 'dist/esm',
	target: 'es2022',
	platform: 'neutral',
	external: ['react', 'react-dom'],
	clean: false,
	treeshake: true,
	minify: false,
	splitting: false,
	metafile: false
})
