import { defineConfig } from 'tsdown'

// The published `aced-bench` bin. Node will not strip types from a file under
// node_modules, so the package ships the engine compiled; the skill keeps running the
// .mts source in place.
export default defineConfig({
	entry: {
		'aced-bench': 'skills/bench/scripts/bench.mts',
	},
	format: 'esm',
	outExtensions: () => ({ js: '.js' }),
	clean: true,
	outDir: 'dist',
	platform: 'node',
	target: 'node22',
})
