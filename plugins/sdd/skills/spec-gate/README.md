# spec-gate

Internal SDD skill that runs the **spec gate** (Draft → Approved) over a CR's spec + suite
**diff**. It runs the deterministic structural checks (`scripts/check-spec-state.mjs` — the root
lifecycle tuple + the per-node `spec-type` reconcile) and the provenance structural checks first
(fail-closed on malformed `produced-by` / no resolvable producer; flag-only on uninstalled
producers), then — running **in-session** as the conductor at the gate — **spawns a distinct cold
spec-judge** over `spec.md` + the `.feature` (the **{oracle, builder, architect}** lens set; the
solution stays out of its view) and derives the leash, then takes the verdict — self-asserting into
the async review queue when in leash, else showing the in-session digest and taking the human
verdict directly (it holds the user channel).

On **approve** it freezes each touched `.feature` per-file (`@frozen`), appends a per-CR `gate`
line to the mission's own `ledger/` shard, and writes `status: approved`; `spec.md`/READMEs stay aligned, never frozen.
The **impl gate** is the mission's, not here. The gate is verdict-only — it writes no setup
frontmatter and never fixes issues automatically.

References `sdd:lifecycle-governance`, `sdd:ownership-governance`, `sdd:gate-validation-governance`,
`sdd:combat-log-governance` (provenance/freeze shapes), and the conductor's autonomy bar.

## Engines

Source and tests are in `plugins/sdd/src/spec-gate/`; `universal-plugin plugin build` compiles each
engine into `scripts/<engine>.mjs`, which is what the skill runs.

- `check-spec-state.mts` — deterministic state validator (root tuple + per-node spec-type
  reconcile); run via `pnpm verify:specs-new`. Tested by `check-spec-state.test.mts`.
- `check-suite.mts` — deterministic `.feature`-form validator (Gherkin validity, boolean-`Then`
  form, scenario ordering); run via `pnpm verify:specs-new`. Tested by `check-suite.test.mts`.
  The build inlines gherkin-cli from `src/vendor/gherkin-cli.mjs`, a committed self-contained
  bundle, so the compiled script runs from an installed plugin, which has no `node_modules`.
  `pnpm --filter cyber-sdd build:vendor` rebuilds the bundle; `check-suite-installed.test.mts`
  runs the engine from a copy of the plugin's files and fails while the bundle is stale.
- `classify-edit-class.mts` — the structural edit-class classifier for touched frozen `.feature`
  files. The build inlines the same `src/vendor/gherkin-cli.mjs` bundle; `classify-edit-class-installed.test.mts`
  runs it from a copy of the plugin's files.
- `src/vendor/gherkin-cli.mjs` is shared: `touch-set-correction` and `verify-scenarios` inline it
  too, so every compiled script stays self-contained.
