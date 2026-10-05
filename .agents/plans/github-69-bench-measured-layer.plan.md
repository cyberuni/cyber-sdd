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
    status: in_progress
  - content: "deliver skill: plugins/aced/skills/bench/SKILL.md (+ README) against the frozen skill.feature"
    status: in_progress
  - content: "impl gate: cold sdd-impl-judge (engine) + aced-impl-judge (skill); owner ratifies"
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

Spec gate **ratified by the owner**; `engine.feature` and `skill.feature` are `@frozen`, root
`status: approved`, gate line in the ledger shard. This CR (step 2) is done once PR #71 merges.
**Owner (2026-10-04): deliver directly in PR #71**, not a later PR. In progress: port the engine under
`plugins/aced/skills/bench/scripts/` with the Claude Code adapter (needs agent-harness `headless()`),
then the file/package subjects and the bench skill, until every frozen scenario passes the impl gate.

Scope of deliver: everything the two frozen suites cover — so the engine ships all three subject
kinds (issue step 4's `file` / `package` included, since `engine.feature` freezes them). `compare`'s
measured mode and `report`'s measured section stay out: they need additive scenarios on those
nodes' frozen suites first (ledger follow-up seq 3). Engine imports `headlessInvocation` /
`headlessCommand` from `@cyberuni/agent-harness` (published in 0.5.0).

**Resolved (owner re-open, ratified 2026-10-05):** the frozen skill suite paired a file arm with a
git-ref arm for a with-and-without file request, which the engine's strict subject-kind rule makes
incomparable. Both suites re-opened; a with-and-without question is now two `file` arms (`absent` vs
`ref:HEAD`). Skill scenario rewritten and re-frozen; engine gained the additive scenario "two file
arms that differ only in their source compare". Next: SKILL.md arms row + an engine test for the new
scenario, then re-run both impl judges.
