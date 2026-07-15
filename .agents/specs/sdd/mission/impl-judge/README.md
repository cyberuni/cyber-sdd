---
spec-type: behavioral
concept: delivery
---

# impl-judge — judge the implementation against the frozen contract

The **impl-judge** procedure: decide whether the implementation honors the **frozen** `.feature`,
returning pass/fail per scenario plus an orthogonal structural/scope read. This is the default
`sdd-impl-judge` the conductor **spawns cold** at the impl gate (`producer ≠ judge` enforced by
context separation); a plugin's judge covers its own artifact-type
(`../../design/governance-resolution.md`). The judge does not author tests and does not set the
bar (the frozen `.feature` is the bar). Its verdict answers **"does the frozen contract hold"**, not
"did the producer's tests pass" — the producer's own green tests are a **pre-filter, never the
verdict** (`sdd:provenance-model`-adjacent rationale recorded in ADR-0016).

## Use Cases

**Subject** — the impl-judge procedure: collapsing the impl-producer's per-scenario verification
against the frozen `.feature` to a boolean per scenario, and rolling that up to one
implementation-pass verdict.

**Non-goals** — it does **not** author the verification (the impl-producer does), does **not**
write the gate verdict / `approval` / `status` (the [`../conductor/`](../conductor/README.md)
does), and does **not** modify `spec.md` or the `.feature`. It only judges and advises.

The procedure runs at the impl gate; every scenario in
[`impl-judge.feature`](./impl-judge.feature) maps to one of these behaviors:

| Behavior | What it checks |
|---|---|
| **re-derive the oracle from the frozen scenario** | derive "what passing means" from the scenario's Given/When/Then, **not** from the producer's chosen assertions; confirm the authored check genuinely asserts that behavior |
| **re-derivation is universal without a bridge** | absent a scenario bridge, the oracle is re-derived for **every** scenario regardless of blast radius; the producer's passing run never substitutes for re-derivation on a low-blast-radius scenario |
| **consume the scenario bridge (deterministic types)** | for a deterministic artifact-type with a `scenario-bridge.toml`, run [`../verify-scenarios/`](../verify-scenarios/README.md) to classify each frozen scenario PASS / FAIL / UNBOUND; then judge by hand only the set the leash requires — **UNBOUND** always re-derived + verified, **FAIL** failing, a **BOUND+PASS** scenario re-derived + backstopped at **high** blast radius but **accepted on the report** at **low** blast radius; the split reads the **run-level leash**, not a per-scenario tag. A domain with **no** bridge falls back to full by-hand judging (no regression) |
| **discover the bridge under the project's own root** | the config's presence check runs against the resolved project's `project-path` (the root `spec.md` frontmatter field the mission already resolved) — never a single hardcoded repo-root path — so a monorepo member's `<project-path>/.agents/sdd/scenario-bridge.toml` is found; the `.feature` itself resolves at whatever root the mission already located it (independent of the bridge root) |
| **map each frozen scenario to its verification** | one functional test/eval per scenario, located among the impl-producer's verification, never free-authored |
| **a scenario passes only when its behavior is exercised** | pass only when a passing check exercises the observable behavior the scenario asserts; a check that passes without exercising it does not count |
| **the producer's green run is a pre-filter, not the verdict** | the producer's own passing test run is necessary, never sufficient — the judge's independent re-derivation decides |
| **an uncovered scenario fails** | a frozen scenario with no verification, or a failing one, is `failing` |
| **behavioral-exercise backstop (leash-scoped)** | for a high-blast-radius scenario, confirm a passing check **fails when the named behavior is broken** (a scoped mutation of the asserted behavior) |
| **absorption read — a probe match is a finding** | read each illustration / worked example / special-cased literal in the implementation against the **apparatus** of every scenario's `Given`; a match is an **absorption finding** — the artifact quotes the probe it is graded against (`../../authoring/suite-format/README.md`) |
| **independence is health, never drift** | an illustration that shares no apparatus with any `Given` is the **required** end state, not a gap: the judge never reports it as drift and never reconciles the two toward each other |
| **the absorption read is semantic** | a paraphrase that shares no wording with a `Given` is still a match; shared wording between a `Feature` description and the artifact's own description is **not** — both legitimately summarize the same capability |
| **an unclassifiable illustration escalates** | an illustration the judge cannot classify as absorbed or independent is **escalated, never passed by default** (escalate-don't-exempt) |
| **orthogonal structural read** | fold in a fit / no-duplication / no-conflict reading, orthogonal to the builder's lens |
| **a structural finding is a blocker that withholds the pass** | a fit / duplication / conflict finding from the structural read is raised as a **structural blocker** distinct from the per-scenario checks; the implementation is not reported passing while it stands |
| **roll up** | implementation passes **only** when every scenario has a passing, behavior-exercising check |
| **report each failing scenario by name** | every failing scenario is named with the **lens that owns it** and the **check that failed**, per the `## Output` shape |
| **a behavior-changing gap is a BLOCKER** | a gap that needs specified behavior to change is reported, not edited |
| **judge ≠ producer model** | the judge runs in a fresh context **and**, where the harness allows, at a **different model** from the producer — the lever that breaks *correlated* (not just conversational) blind spots |

## The layered verdict (ADR-0016)

Cold context removes the author's *conversational* bias but not a same-model grader's *correlated*
blind spots, and re-running the producer's own assertions only confirms internal consistency. So the
verdict is layered, cheap → expensive, scaled by the **leash** (blast radius,
`../../design/autonomy-rubric.md`):

- **Re-derive from the frozen contract (primary).** Treat each frozen scenario as the **specified
  oracle** and independently confirm the producer's check asserts that behavior — never trust the
  producer's chosen assertion as the definition of passing.
- **Exercise backstop (objective, leash-scoped).** For a high-blast-radius scenario, verify a passing
  check **fails when the named behavior breaks** — a scoped behavioral mutation, applied to the
  behavior the scenario names, **not** the whole codebase (the cost is bounded by the leash, not flat).
- **Producer green = pre-filter.** The producer iterates to green on its own; that run gates entry to
  judging, never the verdict.

For a **deterministic** artifact-type this scaling is mechanized by the
[`../verify-scenarios/`](../verify-scenarios/README.md) bridge: it classifies each frozen scenario
PASS / FAIL / UNBOUND from the project's own test reports, and the judge spends its by-hand budget
only where the **run-level leash** says a wrong verdict costs something — every **UNBOUND** scenario
(re-derive + verify) and every **high-blast-radius BOUND+PASS** scenario (re-derive + exercise
backstop), while a **low-blast-radius BOUND+PASS** scenario is accepted on the bridge report (the
same low-stakes bar that already lets the backstop be skipped). This is the deterministic path only;
absent a bridge the judge re-derives every scenario by hand.

## The absorption read — passing is not evidence of reasoning

Every layer above asks *"does the implementation satisfy the scenario?"*. An implementation that
**absorbed** the scenario satisfies it maximally, so those layers cannot see it — a suite the
artifact quotes grades nothing, and the gate reads that silence as a pass. The absorption read is
the layer that asks the different question: **did the artifact earn the pass, or copy the probe?**
It is **orthogonal to the per-scenario checks** and runs regardless of how they scored.

A scenario's `Given` fixes a **precondition** (contract) and the **apparatus** that makes it
concrete — domain, entities, names, framing (a test vector that binds nothing,
`../../authoring/suite-format/README.md`). The read compares the implementation's illustrations,
worked examples, and special-cased literals against that **apparatus** only. An implementation
handling a `Given`'s precondition is conformance, never absorption.

Classify an ambiguous element with the **swap test** (`../../authoring/suite-format/README.md`):
substitute the `Given`'s domain for an unrelated one; if the `Then` still holds, what you swapped was
apparatus. An element that survives the swap and still appears in the artifact is absorbed — the
producer's own label for it decides nothing. Where the swap test does not settle it, **escalate**.

**Polarity — this is the trap.** Absorption inverts the usual reconcile instinct, and reading it
backward re-contaminates the node on the first pass:

| The implementation's illustration | Verdict |
|---|---|
| **matches** a scenario's `Given` apparatus | **absorption finding** — a blocker |
| **differs** from every scenario's `Given` | **healthy** — the required end state |
| the judge **cannot classify** it | **escalate** — never passed by default |

A mismatch between the suite's probes and the artifact's examples is **deliberate independence, not
drift**. The judge never proposes converging them; a loop that "heals" that gap re-creates the
defect it was built to catch.

**Semantic, not lexical.** Apparatus is usually lifted by **paraphrase**, so a wording match is
neither necessary nor sufficient. A shared-n-gram probe both over-fires (a `Feature` description and
the artifact's description legitimately summarize the same capability) and under-fires (it misses
every paraphrase). The read is a judgment, and where the judgment does not land, it **escalates**.

The finding is a **blocker**: while an absorption finding stands, the implementation is not reported
passing — the same discipline as a structural finding.

## Cold and advisory

The impl-judge runs in a **fresh cold context** the impl-producer cannot reach — the grader does not
share the author's context — and is **a different model from the producer where the harness allows**
(the one lever that breaks correlated blind spots; the conductor sets it,
`../conductor/README.md`). It collapses any graded subject (a rubric score, a threshold) to a
**boolean per scenario**; scoring lingo never leaks into the contract. Its output is **advice** —
the [`../conductor/`](../conductor/README.md) unit turns the pass/fail rollup into the gate
verdict and the leash check.

> **Impl note:** the `sdd-impl-judge` **agent** that realizes this unit is built in the
> cross-cutting `core-agents` step (it is a spawned agent that loads the same governances), after
> the deliver governances exist in `plugins/sdd`. This unit owns the **behavior spec + suite**; the agent
> file is core-agents'.
