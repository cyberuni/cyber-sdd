---
name: impl-producer-governance
description: "Partial Skill: invoke by name only — the SDD default impl-producer procedure. Loaded by the spawned generic builder the conductor dispatches for the impl-producer role, not user-triggered."
user-invocable: false
---

# Impl-Producer Governance — the default build procedure

The procedure the **spawned builder** follows when the conductor runs the **impl-producer** role from the SDD default — no plugin covers the domain and no model-tuned producer agent is named, so the conductor **spawns a generic builder** that **loads this governance and builds** (recorded `produced-by.impl-producer: sdd:automaton`). Unlike the spec / solution-producer (run inline by the conductor — the live grill), the impl-producer is **mechanical and spawned** on every surface (the D-G conductor model). This is the SDD-default builder made explicit as a loadable procedure — what the retired "generic Builder (no agent)" / fabricated `sdd:builder` was always groping for.

Load alongside this governance: the resolved **builder** + **architect** actor bars — to self-align **and** to author the verification — and `sdd:ownership-governance` for the write-ownership matrix. The grader is separate: a **cold impl-judge** (`sdd:sdd-impl-judge` or the plugin's judge) runs the verification this role authored; this governance never declares its own pass verdict.

## Inputs (folded in by the conductor)

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, SOLUTION_PATH
MODE: explore | implement
```

## Procedure

1. **Read the contract.** Read the `.feature` — **every scenario in full, `Given` steps included**; no part of it is excluded from what you read. In `implement` (deliver) mode it is **frozen** — the sealed orders; build against it as the fixed bar. In `explore` mode it is a **draft** — spike against it to probe the contract; a discovery (the chosen solution needs a behavior the `.feature` omits) returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`. The ship-quality impl-judge does not run during explore.

2. **Build the implementation** against the `.feature`, applying the **builder** + **architect** bars (testability/coverage; structural fit — no duplication or conflict). The product/test split is a private detail — it is not surfaced.

   **A `Given` is a test vector, not specification** (`sdd:suite-format-governance` carries the canonical bar and the swap test). Conform to each scenario's `Then`; owe nothing to its `Given`'s apparatus.

   - The `Given`'s **precondition** — the state the `Then` is asserted under — is **contract**: the implementation handles it.
   - The `Given`'s **apparatus** — its domain, entities, names, framing — **binds nothing**: no illustration or worked example you author reuses it, and no branch special-cases a literal it names.
   - **Draw every illustration from a domain the suite does not probe.** An artifact whose illustrations share no apparatus with any `Given` is the required end state, not drift.

   Self-check with the **swap test**: substituting a scenario's apparatus for an unrelated domain leaves your implementation unchanged. Apply it per element — one `Given` routinely carries both a precondition and its apparatus.

3. **Author the verification** — one functional test/eval per frozen scenario, anchored to the frozen scenarios, **not** free-authored from your own sense of done. **Prefer executing the frozen scenario directly** (the `.feature` itself as the runnable check) over mapping it to a hand-written unit test — direct execution keeps the **oracle spec-owned** and only the glue producer-authored. Where a unit-test mapping is unavoidable, the assertion's **expected outcome (oracle) comes from the frozen scenario** (a faithful mapping), never from your own sense of done — the cold impl-judge re-derives that oracle and checks the mapping is faithful (ADR-0016). Any rubric/threshold/score is a validation detail — it never appears in the `.feature`. The impl-judge **runs** this verification; this role does not run it as the gate. A scenario you cannot yet verify is a reported gap, never a fabricated passing check. **When the verification is a runnable test a `verify-scenarios` bridge will read** (a deterministic artifact-type with a `.agents/sdd/scenario-bridge.toml`), author it to bind: place the test under a `spec:<node>` describe namespace and title it with the **verbatim frozen scenario name** (or an `@id:<slug>` leaf) so its report binds back to the scenario and the impl-judge can consume the bridge instead of re-verifying it by hand.

4. **Test levels — acceptance boundary + inner-rule units** (`sdd:suite-format-governance` carries the doctrine). Author the one verification per frozen scenario at the **inner boundary**: substitute the external dependency at its interface seam (the DIP seam) — never the real service, and never a full end-to-end run, unless the domain warrants it.

   Where the domain has a **deterministic inner layer**, also author **unit tests covering the inner-rule combinatorial space** the acceptance `.feature` does not enumerate (truth tables, matrices, boundary semantics) — this coverage is **separate** from the one-verification-per-frozen-scenario duty above, not a substitute for it. Draw the cases from the **inner rules the code composes**, never by enumerating the frozen scenarios. Refactor until **each inner rule has a single home** — a rule several operations depend on lives in one shared place, never duplicated across handlers.

   **A domain with no deterministic inner layer gets no manufactured inner-rule unit tests.** A graded non-deterministic subject (e.g. agent config) has no deterministic inner layer to push combinatorics down to — do not invent unit tests for a layer that does not exist; author only the one verification per frozen scenario at the boundary.

5. **Never modify `spec.md` or the `.feature`** — four-eyes (the builder does not set its own bar). A behavior-changing gap is a `CONTENT_GAP` / `BLOCKER`, never an in-place edit.

## Output (the conductor collects)

```
STATUS:               complete | needs-input | blocked
ARTIFACTS_WRITTEN:    [ paths ]
VERIFICATION_WRITTEN: [ paths ]   # one per frozen scenario
CHANGES_MADE:         <what was built>
QUESTIONS:            [ batched, when needs-input ]
CONTENT_GAPS:         [ { artifact, location, gap } ]
OBSERVATIONS:         [ { owner: architect | strategist, note, evidence } ]
```
