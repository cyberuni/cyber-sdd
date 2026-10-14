import { defineConfig } from 'tsdown'

// The published `aced-bench` bin. Node will not strip types from a file under
// node_modules, so the package ships the engine compiled. The skill runs its own copy,
// compiled into skills/bench/scripts/ by `universal-plugin plugin build`.
export default defineConfig({
	entry: {
		'aced-bench': 'src/bench/bench.mts',
	},
	format: 'esm',
	outExtensions: () => ({ js: '.js' }),
	clean: true,
	outDir: 'dist',
	platform: 'node',
	target: 'node22',
})
