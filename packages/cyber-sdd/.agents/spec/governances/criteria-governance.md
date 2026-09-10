# criteria-governance — the SDD 2 criteria contract

**Status: `draft` — not yet in force.**

This is a **cross-cutting governance**, not a node and not a project spec. It constrains how
every node in SDD 2 is specced, diffed, and gated, so it has no single capability owner and is
not colocated (C20). A governance runs **proposed → in force → retired**; `implemented` is
meaningless for a bar, because a bar is applied rather than built.

Evidence is in [`.research/validate-over-freeze/`](../../../../../.research/validate-over-freeze/conclusion.md).
Vocabulary is in [`GLOSSARY.md`](../../../GLOSSARY.md).

---

## Intent

Intent is argued with, not evaluated. Nothing in this section makes a claim a check could fail.
Aspiration belongs here and nowhere else, which is what stops it becoming a false `implemented`.

| | |
|---|---|
| **Purpose** | Let a project's specification run ahead of its code without lying about what is built, and let the executable suite iterate without ceremony. |
| **Frame** | SDD 2 is the **two-set instance** of the truss model: `{spec}` and `{code, test, story}`, one connection, discharge at the impl gate. |
| **Serves** | An agent amending a spec mid-mission; a producer whose implementation meets a criterion it cannot satisfy; a reader asking what a project actually guarantees today. |
| **Does not serve** | Replacing v1. The two coexist while this is built. SDD 2 re-implements no part of the mission loop. |
| **Direction** | Move checks from judged to computed wherever the same defect can be caught either way. |

**Use cases are intent, not criteria.** v1 already chains
`## Use Cases → ## Control Flow → ## Scenario map → scenarios`: use cases name what the thing
serves and sit upstream of the evaluable end. That is why a backfill can draw the CFG from code
but must recover unserved use cases from request history — the source yields only the *served*
use cases by construction.

**What v1 leaves unmeasured.** One lifecycle flag on the root `spec.md` covers 46 feature files
and roughly 40 nodes; a node README carrying `status` fails closed by deliberate rule. And
`verify-scenarios`, the only mechanism where one side of a comparison is running code, is opt-in
through a `scenario-bridge.toml` that does not exist anywhere in this repository. The
`implemented` claim has never been checked against a suite. It is not wrong so much as
**unfalsifiable**, which is how two of SDD's four outer loops sit inside it unbuilt.

---

## Criteria

Each is a claim a check or a scenario could fail. Markers record how each is enforced and what
stands behind it — `computed` needs no agent, `tested` has trial evidence, `reasoned` does not
yet, `v1 has this` means the machinery already ships.

### A · Shape

**C1.** A node's specification is **intent + criteria**. Criteria live in `{spec}`. The
executable suite lives in `{code, test, story}`. — *tested*

> Only the executable half crosses the boundary. ADR-0034 rejected moving the suite down because
> that direction deleted the criteria, leaving ADR-0016 nothing to re-derive from.

**C2.** Intent makes no evaluable claim. Aspirational detail belongs in intent and is never
expressed as a criterion. — *reasoned*

> Nothing claims `campaign/` is built, so the lie has nowhere to form. This removes a lifecycle
> state rather than adding one.

**C3.** A criterion is **in force only from the approve event that records it**. Intent carries
no such event and incurs no obligation. — *reasoned*

> Promoting intent into criteria is what takes on the debt. This also gives C11 its baseline and
> C10 its drafting behavior for free.

### B · Sets

**C4.** Artifact-sets are drawn by **agent responsibility** — truss's unit-of-change axis.
`{code, test, story}` is one set with one owner. — *reasoned*

> Splitting code from test forces a traversal order: test-first is TDD, code-first reaches for
> what the code does and not for what it must never do. One set removes the question instead of
> answering it, which is ADR-0028's standing co-development doctrine.

**C5.** **Evaluation reports one verdict per criterion.** A set-level verdict is never a
substitute for them. — *reasoned*

> The set is the unit of ownership; the criterion is the unit of evaluation. Coarse sets do not
> mean coarse reporting.

**C6.** Intra-set consistency is the **controller's** job, not a connection. The impl-judge's
intra-quality pass over `code ↔ test ↔ story` is that controller. — *reasoned*

> Completeness strain is defined on a connection and there are no connections inside a set. This
> is what removes the need for a separate coverage pair on axis 2.

### C · Evaluation

**C7.** A connection is declared as a **relation that must hold, never as a handler**. Restoring
it is defined once and is traversable from either end. — *reasoned*

> Procedural framing needs one path per direction: two entry points, two code paths, two results,
> and confluence is gone before the first connection ships. The vocabulary follows from the shape
> — a delta **unsettles** a connection, the connection is **evaluated**, the relation **holds** or
> strain is **raised**, strain is **discharged**, the connection **settles**.

**C8.** **No connection declares a direction.** Direction is recorded on the repair, not on the
relation. — *reasoned*

> Writing direction into a connection bakes in one workflow and makes every other traversal
> second-class. Amending criteria is as legitimate as amending code, which is why an upward repair
> needs an authority check rather than a prohibition.

### D · The ratchet

**C9.** The edit classifier points at **criteria**, not at the suite. Every criteria edit is
classified `additive` / `no-content-change` / `narrowing` / `mixed`. — *v1 has this, on the suite;
reasoned*

> Criteria stay in one set and one format; suites are domain-specific. Pointing at criteria means
> one classifier covers Vitest, `evals.json`, Storybook and prose, with no per-suite differ to
> build in any domain.

**C10.** A criteria edit classified `narrowing` or `mixed` against its approve baseline
**escalates, and is never silently absorbed** — unless the change request pre-authorized that
narrowing. `additive` and `no-content-change` self-clear. — *v1 has the detector; tested*

> A criterion with **no approve baseline has nothing to narrow against**, so authoring before
> approval classifies as additive by construction and the drafting phase needs no special case.
> Pre-authorization is what keeps a deliberate narrowing cheap: declare it in the CR and it is
> argued, not ambushed.
>
> v1 ships this detector and this routing but conditions the trigger on the file still carrying
> `@frozen`. v2 has no such tag; the same trigger comes from the approve baseline in C11, so only
> the condition changes and the detector is reused.

**C11.** The classifier's baseline is **the commit recorded by the approve event** — never the
working head. — *computed, reasoned*

> Frozen-ness becomes derived rather than stored, which is ADR-0017's own rule, and the
> moving-baseline leak closes in the same stroke. v1's ledger `gate` line already carries the
> verdict and what it froze; it needs the ref. **Risk to carry: a squash or rebase orphans it.**

**C12.** **Invariant-suite backstop.** A change that adds behavior while its suite stays invariant
to that behavior has specified nothing. — *computed, tested*

> Stated independently by three of four judges. Computable from a diff plus a coverage run.

**C13.** A criteria relaxation that **verification would not have caught must carry a recorded
argument**. Run the before-suite against the after-implementation; if it still passes, nothing
compelled the edit. — *computed, tested*

> It does not prove bad faith. It proves the edit was invisible to verification, which is the
> class of change that has to be argued rather than presented as necessity.

**C14.** A criterion that **forbids** something requires a check that **fails when the forbidden
thing happens**. This holds regardless of the change's reach. — *v1 has the check; tested*

> Absence of the forbidden thing from a fixture is not evidence it would be ignored if present.
> v1 ships this check but keys it to blast radius alone and lets a low-reach change skip it, which
> is why the one trial miss was within the rules rather than a judge error. Detection is
> mechanical: a negation in the criterion's assertion clause.

**C15.** An **intended edit that yields zero delta is an error**. A zero-delta change raising
nothing stays the rule; the inverse must be surfaced. — *computed, tested*

> The false green on the authoring side: report and reality disagree and nothing detects it. This
> produced the worst defect in the trials themselves, twice.

**C16.** Criteria judgment runs **N > 1 and fails closed on disagreement** — never majority vote.
— *tested*

> 3-of-4 is unreliable at the N=1 a gate actually runs at. ACED already carries this discipline.

**C21.** Every criterion carries a **stable identity**, independent of its wording and of its
position in the document. — *v1 has this; reasoned*

> Without one a classifier cannot tell a *modification* from a *removal plus an addition*, and a
> line-diff is fooled outright by content moved between adjacent criteria. v1 warns about exactly
> that case and keys on the scenario name or an explicit id rather than on lines. **C9 is
> unbuildable without this.**

### E · Authority

**C17.** Every criterion carries an **owner**: `node`, `user`, or `governance`. — *v1 has one
owner; reasoned*

> Freezing did two jobs and the ratchet trial tested one. The diff replaces the freeze's ratchet,
> not its authority gate — a judge reading a diff cannot know a criterion is inherited. v1 has the
> shape as `@pinned`, with exactly one owner.

**C18.** An upward repair on an **inherited** criterion is scoped to that criterion's **owner**,
so the change's reach is measured from the owner rather than from the node. Autonomy is graded on
that reach. — *v1 grades on reach; reasoned*

> Graded, not floored — a blanket prohibition rebuilds v1's rigidity at a smaller scale. v1 already
> measures reach as dependency fan-in and already grades autonomy on it, so scoping to the owner
> makes both grade this unchanged, with no second autonomy bar. It also closes a live under-call: a
> leaf tool retiring a corpus-wide rule is today a tiny touch-set with corpus-wide consequence.

### F · Placement and lifecycle

**C19.** A **project spec carries no `status`**. Lifecycle belongs to the change request; a
project's state is the derived roll-up over its criteria. — *computed, reasoned*

> Three of v1's four values are CR-shaped: a living project is permanently `draft`, a whole
> contract does not `approve`, and `implemented` is momentarily true at best — it is the value that
> went false. Only `deprecated` is genuinely project-level and deserves its own field. Under
> per-criterion evaluation the aggregate is derivable, so storing it is the stored-derived-fact
> ADR-0017 removed `aligned` for.

**C20.** A **cross-cutting contract is a governance, not a node**, and is not colocated — it has
no single subject. A bar with one capability owner colocates with that capability. — *v1 has this;
reasoned*

> v1 already draws this line: the cross-cutting home is for the bars with no single capability
> owner, while single-owner bars live in their capability. Screaming architecture organizes
> capabilities, and a bar is not one, so ADR-0034's colocation does not reach it.

---

## Still open

- **The attentive posture is assumed.** Every judge that caught a ratchet-down was *asked* to
  review a change — the posture a narrowing is routed into. It is not the posture of a check that
  has been routed nothing, and per C10 that is what an unrouted criteria edit gets.
- **Twelve of twenty-one are reasoned, not measured.** All of groups B, C and F, both of E, plus
  C9, C11 and C21. No trial has diffed criteria that are not Gherkin, or put an inherited criterion
  in front of a judge.
- **Generalization.** One subject, and the easy one: a small, deterministic, already-colocated
  tool, at N=2 and N=3 per corrected pair.

ADR-0034 stands unamended, deliberately. Its evidence is not overturned — its premise is, and only
for the arrangement that keeps criteria in the spec set.
