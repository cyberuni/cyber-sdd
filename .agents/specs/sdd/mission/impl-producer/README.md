---
spec-type: behavioral
concept: delivery
---

# impl-producer — build the implementation + its verification

The **impl-producer** procedure: build the implementation **and** one verification per frozen
scenario, against the **frozen** `.feature`. This is the default `impl-producer-governance` the
conductor runs by **spawning a generic builder** that loads the governance (recorded
`produced-by.impl-producer: sdd:automaton`); a plugin / model-tuned producer spawns its own
agent at its own model and effort (`../../design/governance-resolution.md`). Unlike the
spec / solution-producer (which run inline — the live grill), the impl-producer is **mechanical
and spawned** on every surface.

## Use Cases

**Subject** — the impl-producer procedure: turning a frozen (deliver) or draft (explore) `.feature`
into an implementation plus one verification per scenario.

**Non-goals** — it renders **no** gate verdict and does not run its own verification as the gate
(that is the [`../impl-judge/`](../impl-judge/README.md)); it never modifies `spec.md` or the
`.feature`; it writes no control frontmatter; and any rubric / threshold / score is a validation
detail that **never** appears in the `.feature`.

The procedure runs in two **modes** — the freeze is the boundary; every scenario in
[`impl-producer.feature`](./impl-producer.feature) maps to one of these modes or to a cross-cutting guarantee (the build rules, the boundaries, the producer surface):

| Mode | The `.feature` | Purpose | Outcome |
|---|---|---|---|
| **explore** (step 2) | draft, **non-frozen** | build to **learn** — spike to probe the contract | a throwaway spike; a discovery returns as `CONTENT_GAP` / `OBSERVATIONS`, never written into the contract; the ship-quality impl-judge does not run |
| **implement** (step 3, deliver) | **frozen** — the sealed orders | build to **keep** against the fixed bar | the kept implementation + one verification per frozen scenario |

## The build

- **Build against the bar.** Implement against the `.feature`, applying the **Builder** (coverage /
  testability) and **Architect** (structural fit — no duplication or conflict) lenses. The
  product/test split is a private detail, not surfaced.
- **Author one verification per frozen scenario**, anchored to the frozen scenarios — **not**
  free-authored from the builder's own sense of done. **Prefer executing the frozen scenario
  directly** (the `.feature` itself as the runnable check) over mapping it to a hand-written unit
  test; direct execution keeps the **oracle spec-owned** and only the glue producer-authored. Where
  a unit-test mapping is unavoidable, the assertion's **oracle semantics come from the frozen
  scenario** (a faithful mapping), never from the builder's own sense of done — the cold impl-judge
  re-derives that oracle and checks the mapping is faithful (`../impl-judge/`, ADR-0016).
- **Author a deterministic verification to bind via the bridge convention.** When the verification
  is a runnable test a [`../verify-scenarios/`](../verify-scenarios/README.md) bridge will read,
  place it under a `spec:<node>` describe namespace and give it the **verbatim scenario name** as its
  title (or an `@id:<slug>` leaf), so the test report binds back to the frozen scenario and the
  impl-judge can consume the bridge instead of re-verifying it by hand.
- **Two test levels — acceptance boundary + inner-rule units.** The frozen `.feature` is the
  **acceptance/boundary** contract; author its verification at the **inner boundary** — substitute
  the external dependency at its interface seam, not the real service or a full end-to-end run.
  Where the domain has a **deterministic inner layer**, the rule combinatorics the acceptance suite
  deliberately does not enumerate (truth tables, matrices, boundary semantics) are covered by **unit
  tests you author** — their cases drawn from the inner rules, never by enumerating the frozen
  scenarios. Develop both levels **together with** the implementation and **refactor** until each
  inner rule has a single shared home (no rule copy-pasted across handlers)
  (`../../authoring/suite-format/README.md`). A domain with **no** deterministic inner layer has no
  such offload (agent-config is judged through `@rubric` instead).
- **The producer's own test run is a pre-filter, not a verdict.** The builder iterates to green on
  its own checks to learn it is done; that passing run **gates entry to judging, never the gate
  outcome**. The impl-judge decides. A scenario left without a verification is the gap the cold
  impl-judge later reports failing.
- **Owe the `Then`, not the `Given`'s apparatus.** A `Given` is a **test vector**, not specification
  (`../../authoring/suite-format/README.md`). It fixes a **precondition** — contract, which the
  implementation must handle — and the **apparatus** that makes it concrete (domain, entities,
  names, framing) — a probe, which binds nothing. Separate them with the **swap test**: substitute
  the `Given`'s domain for an unrelated one; if the `Then` still holds, what you swapped was
  apparatus. **Read every scenario, including its `Given`: the whole `.feature` is the contract.**
  The rule constrains what you **quote**, not what you read.
  Never lift a `Given`'s apparatus into the artifact as a worked example or illustration, and never
  special-case a `Given`'s literal input. An artifact that quotes the probes it is graded against is
  **teaching to the test**: it passes those scenarios maximally while demonstrating no reasoning,
  and the impl gate cannot tell the difference from a scenario's pass alone. Where the artifact
  needs an illustration, draw it from a domain the suite does not probe.
- **Never edit the contract.** The builder does not set its own bar (four-eyes). A behavior-changing
  gap is a `CONTENT_GAP` / `BLOCKER`, never an in-place edit of `spec.md` or the `.feature`.

## Producer surface

The impl-producer is **spawned**, not inline: the conductor spawns a generic builder that loads
this governance (SDD default, `produced-by.impl-producer: sdd:automaton`), or spawns a named
plugin / model-tuned producer agent at its own model + effort. The grader is always separate — the
cold [`../impl-judge/`](../impl-judge/README.md) runs the verification this role authored; this
governance never declares its own pass verdict.
