import cleaner from 'rollup-plugin-cleaner';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

export default {
	input: './src/AirtablePlusPlus.ts',
	output: [
		{
			file: './dist/AirtablePlusPlus.js',
			format: 'cjs',
			exports: 'named',
			sourcemap: true
		},
		{
			file: './dist/AirtablePlusPlus.es.mjs',
			format: 'es',
			exports: 'named',
			sourcemap: true
		}
	],
	plugins: [
		cleaner({
			targets: ['./dist/']
		}),
		typescript(),
		terser({
			ecma: 2019,
			// This will ensure that whenever Rollup is in watch (dev) mode, console logs will not be removed
			// eslint-disable-next-line @typescript-eslint/naming-convention
			compress: { drop_console: !Reflect.has(process.env, 'ROLLUP_WATCH') },
			output: { comments: false }
		})
	],
	external: ['airtable']
};
