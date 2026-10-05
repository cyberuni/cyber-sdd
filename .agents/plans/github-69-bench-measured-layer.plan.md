---
status: active
todos:
  - content: "intake: read issue #69 design + owner decisions, place nodes under eval-run/bench/"
    status: completed
  - content: "explore: draft eval-run/bench/engine (wrong-squad engine, node:test) spec + suite"
    status: completed
  - content: "explore: draft eval-run/bench/skill (partial skill, ACED-graded) spec + suite + eval.md"
    status: completed
  - content: "explore: extend aced-fit governance, design/fit.md, ADR 0003 with the measured axis"
    status: completed
  - content: "spec-judge: cold sdd-spec-judge (engine) + aced-spec-validator (skill), 3-round cap"
    status: completed
  - content: "handoff: PR with the spec in draft; spec-gate ratification left to the owner"
    status: completed
  - content: "spec gate: owner ratifies, freeze both suites (owner's act, not this mission's)"
    status: completed
  - content: "deliver engine: port bench + bench-compare under plugins/aced/skills/bench/scripts/, one node:test per frozen engine scenario, cyber-aced bin"
    status: completed
  - content: "deliver skill: plugins/aced/skills/bench/SKILL.md (+ README) against the frozen skill.feature"
    status: completed
  - content: "impl gate: cold sdd-impl-judge (engine) + aced-impl-judge (skill); owner ratifies"
    status: completed
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

Landed in PR #71 (owner: deliver in #71): spec gate, engine (`aced-bench` bin) and `bench` skill,
an owner re-open resolving the with-and-without file contradiction across the two suites, and the
impl gate ratified by the owner — root `status: implemented`. Nothing left to resume; the PR waits
on the owner's merge. Out of scope and recorded as ledger follow-ups: `compare`'s measured mode and
`report`'s measured section (step 4), check-freshness reading measured records, the Codex adapter.
