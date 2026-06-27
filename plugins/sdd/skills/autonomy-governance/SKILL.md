---
name: autonomy-governance
description: "Internal skill: the SDD autonomy-risk rubric — the per-decision self-clear-vs-escalate bar over five gradient dimensions plus a hard floor. The risk-assessment side of every escalation point; cooperates with gate-validation-governance (legality) and generalizes the sdd-gate-autonomy leash. A design/eval-time bar consumed by the eval tool (ACES) to set an agent config's autonomy posture; the runtime verdict is made by the capable conductor from its own baked-in logic — not triggered by users directly."
user-invocable: false
---

# Autonomy Governance — the risk-assessment rubric

The bar that answers, for any decision at any escalation point: **may the agent take this step without a human, or must it escalate?** The output is a per-decision **verdict** — `self-clear` or `escalate` — that **always names the dominant dimension / reason**. This is the *risk-assessment* layer; it never asserts which frontmatter state tuples are legal (that is `gate-validation-governance`).

This rubric **generalizes** the `sdd-gate-autonomy` leash (four binary dimensions, wired only to the spec and impl gates) into a standalone gradient rubric over **five** dimensions plus a hard floor, applicable at **every** escalation point. The leash stays the run-level reach mechanism for the two SDD gates; this rubric is the risk model it specializes.

## How a verdict is computed

Assess in this fixed order. The first stop wins.

1. **Hard floor first (invariant, not score-based).** If the decision is in a hard-floor class → `escalate`, reason **`hard floor`**. Stop. No computed score, however confident, unlocks the floor.
2. **Any single high-risk gradient dimension → `escalate`**, naming that dimension as the dominant reason.
3. **All five gradient dimensions low → `self-clear`**, reason `all low`.

> The verdict **always names** the dominant dimension / reason so the consumer sees *why*: `escalate · hard floor (data egress)`, `escalate · contract impact (breaking, 4 dependents)`, `escalate · blast radius`, `self-clear · all low`.

## The hard floor (checked first)

A class of decisions that **never self-clears**, regardless of computed confidence. It is an **invariant**, not a threshold — checked before the gradient assessment; a high gradient score never unlocks it.

| Hard-floor class | Verdict |
|---|---|
| **Data egress / redaction** — sensitive data leaving the environment | always `escalate · hard floor` |
| **Irreversible external publication** | always `escalate · hard floor` |

A decision in either class escalates **even when every gradient dimension reads low risk**. Both the egress and the publication cases escalate by the floor; the egress / redaction case names the hard floor as the reason explicitly. This is **Bucket D** (forge-loop redaction / data egress) — escalate-by-invariant.

## The five gradient dimensions

Each is assessed **low → high**. Low pushes toward self-clear; high toward escalate. **One high dimension forces `escalate`.**

| Dimension | Low risk (toward self-clear) | High risk (toward escalate) |
|---|---|---|
| **Reversibility** | cheap to undo — draft prose, a derived artifact, a git-tracked file in a publishable/installable directory with a cheap revert and **no actual publish/release act** and no external side effect | destructive, or carries an external side effect — an **irreversible publish/release act** or data egress |
| **Blast radius** | narrow **user-facing** impact — no `blocked-by` dependents, no breaking change, **no publish/release act** (mere surface location is not a publish act) | many `blocked-by` dependents, a breaking user-facing change, or an **actual publish/release act** |
| **Contract impact** | **additive / non-breaking** — a new scenario, a new optional path, a clarification that leaves every existing scenario's truth intact | **breaking** — alters or removes an established behavior |
| **Decision novelty** | trivial / defaulted, or already human-ratified | a new contestable choice the human has not seen |
| **Confidence** | evidence converges; a clean judge pass; no unresolved `<!-- open: -->` markers | a marginal verdict; unresolved open markers |

### Reversibility

A decision that edits draft prose with a cheap revert and no external effect reads **low** → if every other dimension is also low, `self-clear`. A **git-tracked source file that lives in a publishable or installable directory** also reads **low** when the change has a **cheap revert, performs no actual publish or release act, and carries no external side effect** — surface *location* is not a publish *act*. A decision that is **destructive** or carries an **external side effect** — an **irreversible publish/release act** or data egress — reads **high** → `escalate · reversibility`.

### Blast radius — measured by user-facing impact, not artifact count and not surface location

Blast radius is measured by **user-facing impact**: `blocked-by` dependents, a breaking user-facing change, or an **actual publish/release act** — **never artifact count** and **never surface location**. A file's *location* in a shipped package is not, by itself, blast radius; only an actual **publish/release act** is.

- No `blocked-by` dependents **and** no breaking change **and** no publish/release act → **low** → self-clears (with the rest low).
- A **git-tracked source file that merely lives in a publishable or installable directory**, with a cheap revert, no breaking change, no `blocked-by` dependents, and **no publish/release act performed** → **low** → self-clears. Surface location is not a publish act.
- An **actual publish or release act** (e.g. `npm publish`) → **high** → `escalate · blast radius`.
- **Many `blocked-by` dependents** (even with no publish act and no breaking change) → **high** → `escalate · blast radius`.
- Edits **many artifacts** but has **no `blocked-by` dependents, no breaking change, and performs no publish/release act** → still **low** → self-clears. Volume of files is not blast radius, and neither is surface location.

> **Weighting — user-facing blast radius carries the most weight.** A **high** user-facing-blast-radius reading **dominates the aggregate** and forces `escalate` **even when every other dimension reads low risk**, naming blast radius as the dominant dimension. (Artifact count and surface location never trigger this — only user-facing impact does: dependents, a breaking change, or an actual publish/release act.)

### Contract impact — the semver model

Contract impact classifies the change **semver-style**. The signal is **not** "is a freeze being re-opened" — freeze re-open is **not itself** the risk. The signal is the **semver class of the change**:

- **Additive / non-breaking** — a new scenario, a new optional path, a clarification that leaves every existing scenario's truth intact → **low** → self-clears (with the rest low).
- **Breaking** — alters or removes an established behavior → **high** → `escalate · contract impact`.

The class is then **weighted by user-impact**: a breaking change to a behavior with many `blocked-by` dependents is higher than the same change to a leaf nobody depends on — the verdict names contract impact and the dependent weight (`escalate · contract impact (breaking, N dependents)`).

**Frozen contracts follow the semver class, not frozen-ness.** A change to a **frozen** `.feature` is governed by this gradient, never by frozen-ness itself:

- A split/merge that **preserves every existing scenario verbatim** → **non-breaking → self-clears** (it self-clears even on a frozen contract).
- A split/merge that **alters or drops** an existing scenario's truth → **breaking → `escalate · contract impact`**.

### Decision novelty

A decision the human has **already ratified**, or a trivial / defaulted one, reads **low** → self-clears (with the rest low). A **new contestable choice the human has not seen** reads **high** → `escalate · decision novelty`.

### Confidence

A decision backed by **converging evidence and a clean judge pass with no open markers** reads **low** → self-clears (with the rest low). A **marginal verdict with unresolved open markers** reads **high** → `escalate · confidence`.

## The aggregate

- **All five dimensions low** (and not on the hard floor) → `self-clear · all low`.
- **Exactly one dimension high** (the other four low) → `escalate`, naming that one dimension as the dominant reason.
- **High user-facing blast radius** → `escalate · blast radius`, even when every other dimension is low (the highest-weighted dimension dominates).

The escalate verdict **names the dominant dimension** every time.

## The survey buckets

A survey of the SDD surface placed every escalation point in one of four buckets. The rubric must classify representative cases from each correctly.

| Bucket | Meaning | Rubric behavior |
|---|---|---|
| **A** | Already risk-gated — the model being generalized (spec gate, impl gate, leash ceiling, Director-revert) | self-clears **when low-risk**, escalates when any dimension is high |
| **B** | Mandatory today but risk-gradable → *should* self-clear when low-risk (freeze re-open, split-spec / dedupe-specs checkpoints, formation-loop surfacing, doctrine keep-or-cut, campaign go/keep, change-request accept, forced spec re-review) | self-clears when the change is **additive / low-risk** — the value this governance unlocks |
| **C** | Irreducibly human — **intent**, not risk (iteration-cap accept/change, observation accept/decline, operator needs-input, domain disambiguation, escape-hatch classification, inject, gateway 4-option menu) | **always `escalate`**, regardless of computed score — the verdict names the decision as an **intent decision** |
| **D** | Hard floor (forge-loop redaction / data egress) | **always `escalate · hard floor`** by invariant |

- **Bucket A** — e.g. an impl-gate decision whose reversibility, blast radius, contract impact, novelty, and confidence all read low → `self-clear`.
- **Bucket B** — e.g. a **freeze re-open whose change is additive** and whose other dimensions are low → `self-clear`; a **change-request accept that is non-breaking and low user-facing impact** → `self-clear`.
- **Bucket C** — e.g. an **observation accept-or-decline** or a **domain-disambiguation** decision, **even when every gradient dimension reads low risk** → `escalate`. The verdict names it an **intent decision**. Intent is *the human's to make* — it is not a risk computation at all.
- **Bucket D** — escalate by the hard-floor invariant (above).

> **C and D both always escalate, for different reasons.** C is escalate-**by-intent** (the decision is the human's; there is no risk score to compute). D is escalate-**by-invariant** (the hard floor). The rubric encodes both as non-self-clearing without conflating them.

## How the rubric is consumed

The rubric is a **design/eval-time bar**, like `skill-design` is for skills — it has a **single consumer** and is **not loaded at runtime by any agent**. It explicitly **rejects** the "one governance loaded everywhere on every decision" pattern.

| Consumer | When | What it does |
|---|---|---|
| **The eval tool / ACES** | design time | sets and verifies each agent config's escalation **posture** against the rubric as the bar |

At **runtime** the self-clear-vs-escalate verdict is **made by** the most capable conductor agent — but from that agent's **own baked-in determination logic**, authored to conform to this rubric. The conductor does not *consume the rubric document* at runtime; **no runtime actor does**. An agent's baked-in logic carries only the rubric dimensions its own decisions touch (the operator's gates touch contract impact but never the hard floor).

### Who makes the runtime verdict — the capable conductor

The runtime self-clear-vs-escalate verdict is a **gradient judgment, not a lookup**. It belongs to **the most capable conductor agent in the system** — phrased portably as exactly that, so the contract survives migration to ACES; it binds to the **role** (the capable conductor), never to the literal string `sdd-operator`. In SDD that role is the opus operator; for structural acts it is the formation-loop Warden.

- The verdict **is produced by the conductor** and **is not produced by a non-conductor delegate**.
- A **non-conductor runtime actor** neither loads the rubric per decision nor needs a capable model for this purpose — its posture is **already baked into its config** at design time. When such an actor takes a decision, **it does not load the rubric** for that decision.

### Outer-loop delegates — Scanner escalates, Warden is rubric-subject

The two outer-loop delegates are **not symmetric**:

- **The doctrine-loop Scanner is intent-class.** A doctrine / process change alters *how we work* for every future mission — it is **intent** (Bucket C), not risk. When the Scanner reaches such a decision **even with every gradient dimension low**, the verdict is **`escalate`** and the Scanner produces **no self-clear verdict**. It stays a less-capable model precisely because it makes no runtime verdict (it drafts-always-unratified).
- **The formation-loop Warden is rubric-subject — it IS a conductor.** The Warden applies the full gradient rubric per structural act and makes **its own** verdict. It **self-clears** a coverage-preserving, derivable, low-user-facing-blast act — e.g. re-rendering the derived spec graph whose change preserves every scenario — landing a **provisional agent-attributed marker in the async human review queue**. It **escalates** destructive acts (deprecating a spec in a dedupe), contested acts (picking the winning claim in a reconciliation), and breaking changes.

> **No contradiction with "only the capable conductor makes the verdict."** The Warden making its own verdict is *consistent* with that rule because the Warden **is** a conductor (the same class as the operator). The Scanner is the non-conductor outer-loop delegate that makes no verdict — it surfaces and stops. The rule binds to the conductor **role**, not to a loop position.

### A self-cleared verdict is provisional, never final

A self-clear is **provisional** and **agent-attributed**. When a self-clear verdict is recorded, it **is agent-attributed**, the decision **lands in the async human review queue**, and the decision **is not final**. Self-clear advances the work without blocking on a human in-line, but the human still ratifies the trail — self-clear **never** makes a decision final on its own.

### Eval-time consumption

At config-design time the eval tool / ACES checks each escalation point's **posture** against the rubric verdict. When an escalation point's posture **mismatches** the rubric verdict, the evaluation **flags** that escalation point.

## Relationship to the gate contracts

This governance is the **risk-assessment** side. It **cooperates with** — and must not duplicate or contradict — the gate contracts:

- **`sdd-gate-autonomy` (the leash)** — this rubric **generalizes** it: it adds contract impact and the hard floor, makes the dimensions gradients, and applies to all escalation points rather than the two gates. The leash remains the run-level reach mechanism (`auto-none` / `auto-spec` / `auto-all`, ceiling, per-gate re-derivation) for the SDD gates; this rubric is the risk model it specializes.
- **`gate-validation-governance` (gate legality)** — stays the **legality** contract: legal `(status, aligned, markers, .feature, approval)` tuples and approval attribution. This rubric **never asserts which state tuples are legal** or who may write `status`; for a decision at an SDD gate already covered by the leash, the rubric emits only a `self-clear | escalate` verdict and **does not assert which frontmatter state tuples are legal**.

> Legality answers *"is this state/approval well-formed?"*; this rubric answers *"may the agent take this step without a human?"* They cooperate; they do not overlap.

## Portability — ACES is the intended future home

The contract is **plugin-portable**. It ships as an SDD fallback governance, sibling to `architect-governance`, `director-governance`, and `gate-validation-governance`, but **nothing binds it to the SDD plugin**: the conductor role is phrased abstractly ("the most capable conductor agent in the system"), and the rubric is a general agent-config-autonomy bar. **ACES (the agent-configuration domain) is the intended future home** — this contract is designed to migrate into or be enhanced by ACES when ACES is ready to own the agent-config autonomy concern. When the contract is inspected for its future home, it **names ACES** and **stays plugin-portable**.
