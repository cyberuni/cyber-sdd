---
status: active
todos:
  - content: "intake: read issue #69 design + owner decisions, place nodes under eval-run/bench/"
    status: completed
  - content: "explore: draft eval-run/bench/engine (wrong-squad engine, node:test) spec + suite"
    status: in_progress
  - content: "explore: draft eval-run/bench/skill (partial skill, ACED-graded) spec + suite + eval.md"
    status: pending
  - content: "explore: extend aced-fit governance, design/fit.md, ADR 0003 with the measured axis"
    status: pending
  - content: "spec-judge: cold sdd-spec-judge (engine) + aced-spec-validator (skill) to convergence"
    status: pending
  - content: "handoff: PR with the spec in draft; spec-gate ratification left to the owner"
    status: pending
  - content: "spec gate: owner ratifies, freeze both suites (owner's act, not this mission's)"
    status: pending
---

# CR github-69 step 2 — spec ACED's measured layer (`eval-run/bench/`)

Source: https://github.com/cyberuni/cyber-sdd/issues/69 (section 7, step 2; owner decisions in
the issue's last comment).

## Intent

Move repobuddy's `agent-readiness bench` into ACED as the **measured** layer: real headless runs
of a task set, graded by deterministic shell checks, compared with permutation statistics. This CR
is **spec only** — it stops at the spec gate, and the gate verdict belongs to the owner.

## Shape

- `eval-run/bench/` — descriptive index for the measured layer.
- `eval-run/bench/engine/` — behavioral; the deterministic engine (`plan` / `run` / `compare` /
  `init`). Fit **wrong-squad** → ACED recuses; SDD-default producer and judge; verified by
  `node:test`. No `eval.md`.
- `eval-run/bench/skill/` — behavioral; the `bench` skill wrapping the engine (plan, consent,
  report). Fit **partial**; ACED-graded via `eval.md`.
- `aced-fit` governance + `design/fit.md` + ADR 0003 — the orthogonal `measured: worth | not-worth`
  axis, declared in `eval.md` under `bench:`.

## Settled (owner, issue #69)

Paths as proposed; dollars recorded and compared but never gate; ACED owns the runner core (#64's
runner half); ACED publishes a bin; headless facts in `@cyberuni/agent-harness`; layer "measured",
`eval.md` key `bench:`; `baseline.json` committed; no interactive runner in v1;
`bypassPermissions` only inside the throwaway worktree, stated in every plan; Claude Code first;
model matrix is a separate CR.

## Out of scope (later CRs)

`compare`'s measured mode and `report`'s measured section (additive scenarios on those frozen
suites, step 4); the engine build (steps 3–4); the Codex adapter (step 7).

## NEXT

Draft the engine node, then the skill node, then the fit axis; run both cold judges.
