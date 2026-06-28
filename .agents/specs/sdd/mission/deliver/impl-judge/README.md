---
spec-type: behavioral
---

# impl-judge — run the verification against the frozen contract

The **impl-judge** procedure: run the impl-producer's verification against the **frozen**
`.feature`, returning pass/fail per scenario plus an orthogonal structural/scope read. This is the
default `sdd-implementer` the conductor **spawns cold** at the impl gate (`producer ≠ judge`
enforced by context separation); a plugin's judge covers its own artifact-type
(`../../../design/governance-resolution.md`). The judge **runs** the verification the impl-producer
authored — it does not author tests and it does not set the bar.

## Use Cases

**Subject** — the impl-judge procedure: collapsing the impl-producer's per-scenario verification
against the frozen `.feature` to a boolean per scenario, and rolling that up to one
implementation-pass verdict.

**Non-goals** — it does **not** author the verification (the impl-producer does), does **not**
write the gate verdict / `approval` / `status` / `aligned` (the [`../../conductor/`](../../conductor/README.md)
does), and does **not** modify `spec.md` or the `.feature`. It only judges and advises.

The procedure runs at the impl gate; every scenario in
[`impl-judge.feature`](./impl-judge.feature) maps to one of these behaviors:

| Behavior | What it checks |
|---|---|
| **map each frozen scenario to its verification** | one functional test/eval per scenario, located among the impl-producer's verification, never free-authored |
| **run the result per scenario** | pass only when a passing check exercises the observable behavior the scenario asserts |
| **an uncovered scenario fails** | a frozen scenario with no verification, or a failing one, is `failing` |
| **orthogonal structural read** | fold in a fit / no-duplication / no-conflict reading, orthogonal to the builder's lens |
| **roll up** | implementation passes **only** when every scenario has a passing check |
| **a behavior-changing gap is a BLOCKER** | a gap that needs specified behavior to change is reported, not edited |

## Cold and advisory

The impl-judge runs in a **fresh cold context** the impl-producer cannot reach — the grader does not
share the author's context. It collapses any graded subject (a rubric score, a threshold) to a
**boolean per scenario**; scoring lingo never leaks into the contract. Its output is **advice** —
the [`../../conductor/`](../../conductor/README.md) unit turns the pass/fail rollup into the gate
verdict, the leash check, and `aligned`.

> **Impl note:** the `sdd-implementer` **agent** that realizes this unit is built in the
> cross-cutting `core-agents` step (it is a spawned agent that loads the same governances), after
> the deliver governances exist in sdd-new. This unit owns the **behavior spec + suite**; the agent
> file is core-agents'.
