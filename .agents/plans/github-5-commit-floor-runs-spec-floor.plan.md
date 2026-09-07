---
status: active
todos:
  - content: "explore: place + draft corpus/spec-floor (the corpus-tier harness + its totality rule)"
    status: in_progress
  - content: "explore: revise corpus/README + root spec.md capability index for the new unit"
    status: pending
  - content: "spec gate: cold sdd-spec-judge to convergence, freeze corpus/spec-floor.feature"
    status: pending
  - content: "deliver: --corpus mode in check-project-specs.mts, drop --check-coverage, reject unknown flags"
    status: pending
  - content: "deliver: wire root check:specs to the total mode; fix the 2 broken loops.md anchors"
    status: pending
  - content: "deliver: regression tests — truncated node and deleted node must fail the root floor"
    status: pending
  - content: "impl gate: cold sdd-impl-judge, pnpm verify green with the floor live"
    status: pending
  - content: "handoff: changeset, commits, PR against main referencing issue #5"
    status: pending
---

# CR github-5 — the commit floor must run the spec floor

Source: https://github.com/cyberuni/cyber-sdd/issues/5

## Intent

`pnpm verify` reports green over structurally destroyed spec content. `CLAUDE.md` tells every actor
to run `verify` before committing and CI runs it on every PR, so the repo treats green as clearance.
For structural spec damage it is not.

## Root cause (verified, not inherited)

`check-project-specs.mts` hosts **two tiers in one binary**, switched by a flag:

- `main()` early-returns on `--check-coverage` → `checkCoverage(root)` (corpus tier).
- Otherwise → `checkProject(argv)`, the **only** caller of `ENGINES` (project-spec tier).

Root `check:specs` passes `--check-coverage`, so the ENGINES chain is unreachable from `verify`.
The flag reads as "additionally check coverage"; it means "check coverage **instead**".

Second, independent: **nothing at the root ever runs any project's `check:spec`.** `turbo.json`
defines no such task; `.husky/pre-commit` runs biome + test only; CI runs `pnpm verify` and nothing
more. `findCoverageGaps` only asserts the `check:spec` **string exists** in a manifest — it never
runs it. So six engines (`concept-index`, `check-spec-structure`, `align-spec`,
`check-spec-references`, `check-scenario-overlap`, and `check-suite`) are reachable by **nothing**
in the repo, and `check-spec-state` survives only via spec-gate prose at gate time.

Both triggers reproduced in this worktree against `main`:

| Trigger | root `check:specs` | plugin `check:spec` |
|---|---|---|
| a node's README truncated mid-file (Use Cases / Control Flow / Scenario map destroyed) | **exit 0** | exit 1 (`check-spec-state`) |
| a whole node's README + frozen `.feature` removed | **exit 0** | exit 1 (`concept-index`, `check-spec-references`) |

## Decisions (the issue's open questions, answered)

- **Affordability — measured, not guessed.** Full per-project chain: sdd 2.97s, aced 2.07s,
  quill 0.93s ≈ **6s corpus-wide**. Cold `verify` is 15.6s → ~22s. **No scoping to changed nodes
  is needed**; the floor runs over the whole corpus every time. This is not a human decision.
- **Which branch gives way.** Neither, as stated. Removing the early return alone fixes nothing:
  `checkProject` at the repo root resolves no governing spec and exits 0 "skipped". The engine needs
  a **total corpus mode** — coverage **and** the ENGINES chain for every discovered project-spec.
- **Where the recursion lives: in the engine, not the package manager.** `pnpm -r check:spec` would
  work here but SDD ships as a plugin to repos that may not use pnpm, and it would leave the
  guarantee mediated by an existence check on a manifest string. `--corpus` makes totality intrinsic
  and portable.
- **Coverage stays load-bearing inside `--corpus`.** `--corpus` iterates *discovered* specs, so a
  spec whose `status` is off-enum is invisible to it — exactly the `unrecognized` gap coverage
  catches. The two compose; neither alone is total.
- **The weak mode is removed, not kept.** `--check-coverage` is deleted and unknown flags now
  **error loudly**. Kept as a flag it stays available to be wired into a floor by accident, which is
  the whole defect. Today an unknown flag falls through to `checkProject` and exits 0 — silent.
- **Other callers of `--check-coverage`:** exactly one, the root chain. No silent inheritors.
- **The impl gate.** It has **no mechanical floor to be missing** — by design its verdict is a cold
  judge re-deriving each frozen scenario's oracle (ADR-0016), and the corpus explicitly forbids
  mechanizing the absorption read. But the bug *does* cost the impl gate a guard:
  `check-spec-state.mts` enforces the impl gate's legality tuples too — `implemented` with no
  `approval.impl` ratification, and `implemented` with no durable ledger `gate: impl` line. Those
  live in `ENGINES` and are therefore just as dead. Fixing this restores an impl-gate guard.

## Blocking pre-existing defect

`.agents/specs/sdd/design/loops.md:90,143` reference `../../cyberfleet-plugin/operator/`, a
project-spec that lives in a different repo. `check-spec-references` fails on both. The floor is red
until they are corrected to the non-relative form already used at `loops.md:12`. This is a prose
anchor correction, not a contract change.

## Working method

SDD's own mission loop, conductor in-session. Producer inline under `spec-producer-governance`; cold
`sdd-spec-judge` at the spec gate, cold `sdd-impl-judge` at the impl gate. No plugin role-map is
registered in this repo (`.agents/universal-plugin.json` absent), so both judges are SDD defaults.
Commit per unit of work.

**Run `check-spec-state` and `check-suite` directly on everything this CR touches.** A green `verify`
is the bug under repair and is not evidence until the last todo lands.

## Concurrency

Two other ships are live. `sdd-3-backfill` (#3, halted at its impl gate, PR #7) owns
`spec-format-governance`, `suite-format-governance`, the spec-gate pre-flight, and the backfill
workflow node — untouched here. `sdd-4-next-arch` (#4, PR #6) owns ADR-0034 and `knip.json` — this
CR does not edit `knip.json`.

## Observations routed here, not acted on

- **(strategist, from the round-2 spec-judge)** The `spec gate` actor's UC2 use case is served only
  coincidentally: `spec-gate/SKILL.md` invokes `check-spec-state.mts` and `check-suite.mts`
  directly rather than through the harness's project scope, even though both are entries in the
  harness's own engine set. Not part of #5 and not verified broken — recorded, not fixed here.
- **(architect, producer-side)** `verify-scenarios` is the impl gate's only deterministic
  component, and it has no live caller in this repo: it is invoked from prose only, gated on a
  `<project-path>/.agents/sdd/scenario-bridge.toml` that exists nowhere here. A finished, tested
  engine wired to nothing. This is the impl gate's real gap — distinct from #5's, which cost the
  impl gate its `check-spec-state` legality guards (`implemented` with no recorded ratification, and
  with no durable ledger `gate: impl` line) and is closed by this CR.

## NEXT

Explore: draft the new behavioral node `corpus/spec-floor/` (the corpus-tier harness — totality,
the two composing sub-checks, the loud unknown-flag failure) plus its `.feature`, and add its row to
`corpus/README.md` and the root `spec.md` capability index. Then the spec gate.
