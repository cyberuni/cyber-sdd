# impl-producer-governance

This is an internal SDD governance about the default procedure for building an implementation.

When a change request reaches the build phase and no plugin covers the domain, the conductor spawns
a generic builder for the **impl-producer** role. This governance is the procedure that builder
follows: read the frozen contract, build against it, author one verification per frozen scenario,
and never touch the contract itself. It loads alongside the resolved **builder** and **architect**
impl-gate bars (to self-align and to author the verification) and `ownership-governance` (who may
write what). The grader stays separate: a cold impl-judge runs the verification this role authored —
this role never declares its own pass.

## What it requires — the procedure

| Step | What it demands |
| --- | --- |
| **Read the contract** | Read the suite in full, `Given` steps included. In `implement` mode it is frozen — the fixed bar. In `explore` mode it is a draft — spike to probe it; a behavior the suite omits is reported as a `CONTENT_GAP`, never written into the spec or suite. |
| **Build against the suite** | A `Given` is a test vector: conform to each scenario's `Then`, owe nothing to its `Given`'s apparatus. Draw illustrations from domains the suite does not probe; special-case no literal a `Given` names; self-check with the swap test. |
| **Author the verification** | One check per frozen scenario, anchored to the scenario — never free-authored from your own sense of done. Prefer executing the frozen scenario directly, so the oracle stays spec-owned and only the glue is producer-authored. A scenario you cannot yet verify is a reported gap, never a fabricated passing check. |
| **Verify as high as it doesn't hurt** | Pick each scenario's verification level to maximize confidence until cost, fragility, or feasibility bites: a cheap base, a thin e2e cap on the paths that matter, and boundary (the external mocked at its seam) as the honest substitute where e2e is infeasible or unsafe. Record the level and why. Where the domain has a deterministic inner layer, also cover its combinatorial space with unit tests — the pyramid's base, separate from the per-scenario duty. |
| **Never modify the contract** | `spec.md` and the suite are off-limits (four-eyes). A behavior-changing gap is a `CONTENT_GAP` / `BLOCKER`, never an in-place edit. A `@pinned` scenario is never changed or removed without user authorization. |

The builder reports back a structured output the conductor collects: status, artifacts written,
verification written (one per frozen scenario, each with its level and why), content gaps, and
observations routed to their owners.

## Usage

- **impl-producer (the spawned generic builder):** loaded via the harness when the conductor
  dispatches the impl-producer role and no plugin covers the domain and no model-tuned producer is
  named. This is a procedure the builder follows, not a bar graded at a gate — the grading happens
  afterward, when the cold impl-judge runs the verification this procedure produced.

## Related governances

This governance owns *how the default builder works*. Its neighbors own the bars and contracts it
works under:

- **`builder-impl-governance`** — the Builder bar at the impl gate: does the implementation meet the
  frozen contract. This procedure applies that bar; it does not define it.
- **`architect-impl-governance`** — the Architect bar at the impl gate: structural fit of the
  implementation. Same relation — applied here, defined there.
- **`ownership-governance`** — the write-ownership matrix behind the never-edit-the-contract rule
  and the `@pinned` authorization path.
- **`suite-format-governance`** — how the `.feature` suite is written, including the
  Given-is-a-test-vector doctrine this procedure builds under.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
