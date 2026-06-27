# Autonomy rubric — the self-clear-vs-escalate bar

This rubric is the single self-clear-vs-escalate arbiter for **every SDD autonomy decision** —
every write to the spec/suite, each gate's self-assertion (via the leash), and every outer-loop
delegate act (including the forge loop's opt-in egress, the Consent floor). There is **no
mandatory approval station**: the initial CR-grilled diff and every in-flight adjustment go
through this one rubric, which decides `self-clear` or `escalate`. The human is an **escalation
target the bar invokes**, not a fixed checkpoint — humans decide *what to build* by raising the CR
and reading the outcome, not by gating each transition.

The rubric **defines** the bar; the conductor **enacts** it. It is a **design/evaluation
artifact**, not a runtime monolith loaded on every decision. At design/eval time the consumer is
the eval tool (ACES), which sets and verifies each agent config's escalation posture against it.
At runtime the verdict is made by **the most capable conductor model** (in SDD, `sdd-operator`)
from its own **baked-in** determination logic authored to conform to this rubric — never by
loading the document per decision. An agent's baked-in logic carries only the inputs its own
decisions touch.

## The hard floor — the only mandatory human escalations

The hard floor is checked **first** and is **not score-based**. A high computed confidence never
unlocks it; the floor sits above the gradient entirely. **Three kinds** (the mnemonic: three
**C**'s):

| Floor | Fires at | Trigger | Human decision | Pre-grantable? |
|---|---|---|---|---|
| **Clearance** | authoring (2) / impl gate (3) | a **breaking change beyond the authorized class** — the contract is narrowed: a frozen / e2e scenario weakened or deleted, or a published contract broken (**mechanical arm** — scenario-diff), **or** the resolved **Builder** governance judges an un-contracted user-facing change a break (**judged arm**) | grant clearance — authorize the class | **Yes** — pre-authorizable in the CR or run-mode (stated, or acknowledged during grilling), so it need never halt mid-flight |
| **Conflict resolution** | impl gate (3) | the suite **contradicts itself** — two scenarios at odds with **no intended winner** | pick which scenario is intended | **No** — a discovered defect, not a grantable permission |
| **Consent** | **forge loop** (5) | the cross-installation field loop wants to **run or report** — **data egress** of correction records | opt in (explicit, default-off, revocable) | **Yes** — granted up front |

- **Clearance carries breaking-ness.** Breaking is **not a gradient dimension** — it is the
  Clearance trigger, detected two ways: a **mechanical arm** (scenario-diff — preserved verbatim →
  non-breaking; altered / removed / narrowed → breaking) and a **judged arm** (the resolved
  **Builder** governance for the artifact-type, where the contract is silent — e.g.
  designer-as-Builder ruling a UI restyle a break). Both are **domain-relative** (a design-system
  library is stricter than an app — it is just a different resolved `builder` bar, per
  `governance-resolution.md`) and **pre-authorizable**. A new scenario that contradicts an old
  frozen one is **Clearance** (a clear intended winner — the new replaces the old), not Conflict.
  Breaking field workarounds that **no frozen scenario protected** is a *noted risk*, not a
  contract break.
- **Conflict resolution** is the only thing that truly halts work **unexpectedly** — reduce it by
  grilling harder at authoring. An obvious stale-mistake contradiction is an operator-served minor
  fix; escalate only when both sides are plausibly intended.
- **Consent** is the **only execution-side floor** — opt-in egress to `../forge/`. SDD does **not**
  publish / release / deploy (those are downstream SDLC, externally guarded — e.g. a marketplace
  publish is a PR behind auth and review); **the rubric does not re-gate what already has its own
  guard.**
- **Destructive operational acts** (e.g. resetting external test data) are **pre-authorizable like
  Clearance** — declared in the CR / run-mode, else escalate. Everything SDD writes is
  git-reversible, so the inner loop has no other irreversibility concern.
- Symmetry: **Clearance** and **Consent** are **payable in advance**; **Conflict resolution**
  cannot be.

**Everything additive / internal / minor self-clears.**

## The gradient — three dimensions, two modulate and one decides

Below the floor the bar reads three dimensions. Two **modulate** (they set how much evidence a
self-clear needs); one **decides**.

| Dimension | Role | Low | High |
|---|---|---|---|
| **Blast radius (magnitude)** | modulator | few, peripheral artifacts | many artifacts, or **central / sensitive** ones (high dependency fan-in, marked-sensitive paths). Measured by the **scope and sensitivity of what's touched** — **not** user-facing breakage (that is Clearance), **not** mere surface location. |
| **Novelty** | modulator | trivial / defaulted, or already human-ratified | a new contestable choice the human has not seen |
| **Confidence** | **decider** | evidence converges; a clean judge pass; no unresolved markers | a marginal verdict; unresolved `<!-- open: -->` markers |

**Why git-reversibility is not a dimension.** SDD produces tracked artifacts, so inner-loop work
is cheap to undo — that is the **autonomy license** (the reason self-clear can lean permissive), a
constant baseline, not a per-decision signal. Genuinely irreversible acts are either the
**Consent** floor (egress) or **pre-authorized** (destructive ops); externally-guarded SDLC acts
are out of scope.

## The aggregate verdict

1. **Hard floor first.** A clearance (mechanical | judged, unless pre-authorized),
   conflict-resolution, or consent case → `escalate`, reason `hard floor`. Stop.
2. **Else, confidence decides — blast and novelty raise the bar.** A larger blast or a more novel
   choice demands stronger evidence (a clean judge pass, no open markers, converging analysis).
   They **never independently escalate**.
3. **High confidence (given the modulators) → `self-clear`** (provisional). **Marginal →
   `escalate`.**

There is **no weighting or scoring**: the floor is a hard trigger; below it, confidence is a
single integrated judgment that blast and novelty inform. The verdict **always names its driver**
so the consumer sees *why* — `escalate · hard floor (clearance, judged)`, `self-clear · high
confidence (large but clean refactor)`, `escalate · low confidence (novel choice, unresolved
markers)`.

## A self-cleared verdict is provisional, never final

A self-clear is **provisional** and **agent-attributed** (`by: agent`). It does not make a
decision final: it lands in an **async human review queue** (the set of specs with any
`by: agent`) for ratification. Self-clear advances the work without blocking on a human in-line,
but the human still ratifies the trail. Leaning autonomous is safe precisely because inner-loop
work is **git-reversible** and every self-clear is **async-ratified** — the agent gains reach
without stealing accountability, and the rubric stays a design/eval artifact (the conductor's
runtime verdict comes from its own baked-in logic, not from loading the rubric).

## The change-class posture (run-mode)

The CR — or a **run-mode** in the `strategy` block — declares the **authorized change-class**,
pre-clearing the matching Clearance up front so it never halts mid-flight:

- `bug-fix-only` — only patch-class changes self-clear; minor / breaking escalate or defer;
- `analyze-and-defer-breaking` — surface breaking work as **new CRs**, do not do it this run;
- `expected-breaking` — the breaking class is **pre-authorized** (Clearance granted in advance).

Absent a declaration the default class is **non-breaking**; a breaking change hits Clearance. The
same posture authorizes any declared **destructive operational acts**.

## The leash — the run-level reach over the gates

For the SDD **gates** the bar is expressed as a **leash**: the furthest gate the agent may
self-assert this run, derived from the verdict and capped by an optional human ceiling.

| Level | Self-asserts | Stops at |
|---|---|---|
| `auto-none` | nothing | the **spec gate** |
| `auto-spec` | the spec gate | the **impl gate** |
| `auto-all` | both gates | nothing (both provisional) |

The names follow an `auto-<reach>` scheme — they name **how far autonomy reaches**, not where it
stops. Derived: spec gate would escalate → `auto-none`; spec gate self-clears, impl gate would
escalate → `auto-spec`; both self-clear → `auto-all`. The Conductor may cap the run (`effective =
min(ceiling, derived)`); the agent may stop earlier, never further. The leash is **per
run/sitting** (session-local), held in the `strategy` block, **re-derived at each gate** — an
`auto-none` spec gate does not bind a later impl gate. There is **no per-gate `leash` field** in
an `approval` entry. The leash governs only the **two gates**; non-gate decisions (in-flight
adjustments, outer-loop acts) run the floor + gradient directly.

## The outer-loop delegates — Scanner escalates, Warden is rubric-subject

The two outer-loop delegates are not symmetric: they differ in *what kind of decision* each
reaches, so they differ in whether the rubric applies at all.

| Delegate | Loop | Decision class | Rubric posture |
|---|---|---|---|
| **Scanner** | doctrine | **intent** — a doctrine/process change alters *how we work* for every future mission | **always escalates**, makes **no self-clear verdict**; stays a less-capable model precisely because it needs no runtime verdict |
| **Warden** | formation | **risk** — structural acts on the spec corpus, gradable per act | **rubric-subject** — a **conductor** that applies the full floor + gradient and makes its own self-clear-vs-escalate verdict per act |

- The **Scanner is intent-class**: a doctrine/process change is the human's to keep or cut; it
  surfaces and stops, drafting always-unratified strategy.
- The **Warden is a conductor**: it self-clears git-reversible, coverage-preserving, low-blast acts
  (consistency fixes, refactors that preserve every scenario), leaving a provisional
  agent-attributed marker; it escalates breaking acts (Clearance — deprecating a spec in a dedupe)
  and contested acts (picking the winning claim in a reconciliation — Conflict).

The rule "only the capable conductor makes the verdict" binds to the **conductor role**, not a
loop position: the Warden making its own verdict is consistent because the Warden *is* a conductor.

## Testability harness

The rubric's verdicts are made testable (vs by-hand vibing) in three layers:

1. **A deterministic helper** (sibling to `check-spec-state.mts`) computes the **mechanical**
   inputs for a proposed act:
   - **Clearance mechanical arm** — **scenario-diff** (preserved verbatim → non-breaking;
     altered / removed / narrowed → breaking), which feeds Clearance-floor detection;
   - **blast radius (magnitude)** — **artifact count × centrality/sensitivity** (dependency
     fan-in, marked-sensitive paths) — **not** surface location.

   Output: which floor arms fire + the blast magnitude. The agent judges the **Builder judged arm**
   (where the contract is silent), **novelty**, and **confidence** — the helper shrinks the
   judgment surface to those.
2. **Baked-in logic** (Warden / operator) = helper output + the judged inputs, run at the relevant
   cadence (Warden per formation act).
3. **An ACES golden suite** mapping `(act, risk profile) → expected verdict`, run at the doctrine
   cadence over the agent configs to catch posture drift mechanically.

Backstop: provisional markers + the async review queue make "conservative + auditable" sufficient,
not "infallible." The golden suite (deterministic helper cases + golden verdicts) colocates with
this rule or in `../acceptance/`.
