import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	splitting: true,
	sourcemap: true,
	clean: true,
	target: 'es2020',
	dts: true,
	format: ['esm'],
	metafile: true
});
