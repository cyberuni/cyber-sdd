# blast-estimate

The concrete engine for **blast-estimate** — a read-only estimate of how much of the project a
Mission could disturb, computed from its touch-set and the project corpus instead of the hand-typed
guess: **breadth** (how many work areas, *and* whether the touch-set covers a project entirely),
`centrality` (dependency fan-in — how many other work areas reference a touched one), and
`sensitivity` (declared, never inferred, in the opt-in `.agents/sdd/sensitive-paths.toml`). Lines the
computed level up against the Mission's declared blast (`agrees` / `under-called` / `over-called`).

Breadth is `max(countScore, coverageScore)` — reach measured absolutely *and* relatively, whichever
says more — so a fully-covered project computes `high` at **any** project size (≥2 areas), not only
once the raw count crosses a bucket. See [`SKILL.md`](./SKILL.md) for the full rule and the
load-bearing ≥2-area guard that keeps the project-wide and single-peripheral scenarios disjoint.

Work-area recovery reuses [`touch-set-correction`](../touch-set-correction/SKILL.md)'s pure
`fileToNode` over `discoverLayouts`' declared `ProjectLayout[]` — never a path-shape guess. A work
area spans its **spec root and its impl root** (`sdd/mission-graph` lives at both
`.agents/specs/sdd/mission-graph/` and `plugins/sdd/skills/mission-graph/`), and fan-in is measured
across **both**, so centrality counts implementation dependency rather than spec prose alone.
Layouts are injected, so tests construct them as fixtures.

```bash
node scripts/blast-estimate.mts --root <corpus> --touch-set sdd/mission-graph,sdd/blast-estimate --declared medium
```

Read-only, deterministic, reports-never-writes — the mission-graph's single writer records the
computed level. See [`SKILL.md`](./SKILL.md) for the full contract and
[`.agents/specs/sdd/blast-estimate/README.md`](../../../../.agents/specs/sdd/blast-estimate/README.md)
for the authoritative behavior description and
[`blast-estimate.feature`](../../../../.agents/specs/sdd/blast-estimate/blast-estimate.feature) for
the frozen 21-scenario contract.

Fan-in counts the reference forms the corpus really uses — the bare id, a `sdd:spec-gate` skill ref,
a path under any **declared root** at any depth, and a same-project relative link — not the bare id
alone, which matched almost nothing on a real tree. It stays **mention-based** by design; symbol-level
dependency is `ssa-lowering` / `collision-ladder` territory.

- **Skill contract:** [`SKILL.md`](./SKILL.md)
- **Script:** [`scripts/blast-estimate.mts`](./scripts/blast-estimate.mts)
- **Tests:** [`scripts/blast-estimate.test.mts`](./scripts/blast-estimate.test.mts) (`node:test`) —
  one test per frozen scenario, titled `scenario: <verbatim frozen scenario name>`.
- **Live-corpus smoke check:**
  [`scripts/blast-estimate.smoke.test.mts`](./scripts/blast-estimate.smoke.test.mts) — **not** bound
  to any frozen scenario. The frozen suite mandates constructed corpora, so it is structurally blind
  to whether the engine measures real reach on a real tree; three defects reached an impl gate
  green-on-all-21 for exactly that reason. This asserts live properties (never magic numbers) and is
  the tripwire for that class.
