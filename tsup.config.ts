import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src'],
	tsconfig: './src/tsconfig.json',
	splitting: false,
	sourcemap: true,
	clean: true,
	target: 'es2020',
	dts: true,
	format: ['esm'],
	metafile: true
});
