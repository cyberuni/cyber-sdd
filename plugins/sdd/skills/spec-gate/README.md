# spec-gate

Internal SDD skill that runs the **spec gate** (Draft → Approved) over a CR's spec + suite
**diff**. It runs the deterministic structural checks (`scripts/check-spec-state.mts` — the root
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

## scripts/

- `check-spec-state.mts` — deterministic state validator (root tuple + per-node spec-type
  reconcile); run via `pnpm verify:specs-new`. Tested by `check-spec-state.test.mts`.
- `check-feature.mts` — deterministic `.feature`-form validator (Gherkin validity, boolean-`Then`
  form, scenario ordering); run via `pnpm verify:specs-new`. Tested by `check-feature.test.mts`.
