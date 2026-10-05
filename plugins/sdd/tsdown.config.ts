import { defineConfig } from 'tsdown'

// The published `sdd-check-specs` bin. Node will not strip types from a file under
// node_modules, so the package ships the harness compiled — together with every engine it
// spawns. The skill keeps running the .mts source in place.
//
// Unbundled, so dist/ mirrors skills/ one module per file: every script guards its CLI on
// its own `import.meta.url`, and a bundle that inlined one script into another would fire
// the inlined script's main() too.
export default defineConfig({
	entry: [
		'skills/check-project-specs/scripts/check-project-specs.mts',
		'skills/spec-gate/scripts/check-spec-state.mts',
		'skills/spec-gate/scripts/check-suite.mts',
		'skills/concept-index/scripts/concept-index.mts',
		'skills/check-spec-structure/scripts/check-spec-structure.mts',
		'skills/align-spec/scripts/align-spec.mts',
		'skills/check-spec-references/scripts/check-spec-references.mts',
		'skills/check-scenario-overlap/scripts/check-scenario-overlap.mts',
	],
	unbundle: true,
	root: 'skills',
	format: 'esm',
	outExtensions: () => ({ js: '.js' }),
	clean: true,
	outDir: 'dist',
	platform: 'node',
	target: 'node22',
})
