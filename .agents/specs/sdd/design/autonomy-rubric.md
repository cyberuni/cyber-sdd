# Autonomy rubric — the self-clear-vs-escalate bar

The single arbiter every write to the spec/suite passes. There is **no mandatory approval
station**: the initial CR-grilled diff and every in-flight adjustment pass this one
rubric, which decides `self-clear` or `escalate`. The human is an **escalation target the
bar invokes**, not a fixed checkpoint — humans decide *what to build* by raising the CR
and reading the outcome, not by gating each transition.

The rubric is a **design/evaluation artifact**, not a runtime monolith loaded on every
decision. Its consumer at design/eval time is the eval tool (ACES), which sets and
verifies each agent config's escalation posture against it. At runtime the verdict is
**made by the most capable conductor agent in the system** (in SDD, the opus
`sdd-operator`) from its own **baked-in** determination logic authored to conform to this
rubric — never by loading the rubric document per decision. An agent's baked-in logic
carries only the dimensions its own decisions touch.

## The hard floor — the only mandatory human escalations

The hard floor is checked **first** and is **not score-based**. A high computed confidence
never unlocks it; the floor sits above the gradient entirely. **Three kinds**, each at its
own location (the mnemonic: three **C**'s):

| Floor | Fires at | Trigger | Human decision | Pre-grantable? |
|---|---|---|---|---|
| **Clearance** | authoring (2) / impl gate (3) | the contract is **narrowed** — an e2e/acceptance scenario is weakened or deleted, or a **published contract** is broken | grant clearance to narrow | **Yes** — pre-authorizable in the CR (stated, or acknowledged during grilling), so it need never halt mid-flight |
| **Conflict resolution** | impl gate (3) | the suite **contradicts itself** — two scenarios at odds with **no intended winner** | pick which scenario is intended | **No** — a discovered defect, not a grantable permission |
| **Consent** | **forge loop** (5) | the cross-installation field loop wants to **run or report** — **data egress / irreversible external publication** of correction records | opt in (explicit, default-off, revocable) | **Yes** — granted up front, before the loop runs |

- **Clearance** is detected at authoring (the diff weakens a scenario) *or* at the impl
  gate (an e2e scenario regresses). The same word covers both; pre-authorizing in the CR
  just means clearance granted early, so the impl gate runs clean. A new scenario that
  contradicts an old frozen one is **Clearance** (a clear intended winner — the new
  replaces the old), not Conflict resolution.
- **Conflict resolution** is the only thing that truly halts work **unexpectedly** — reduce
  it by grilling harder at authoring. Softening: an obvious stale-mistake contradiction is
  an operator-served minor fix; escalate only when both sides are plausibly intended.
- **Consent** is scoped to `../forge/` (the field-telemetry loop) and is the **only**
  execution-side floor. Local irreversible acts with no external side effect (force-push,
  history rewrite, data loss) are **not** a floor — they ride the reversibility gradient.
- Symmetry: **Clearance** and **Consent** are **payable in advance**; **Conflict
  resolution** cannot be.

**Everything additive / internal / minor self-clears.**

## The gradient — four risk dimensions

Below the floor, the bar assesses four dimensions, each **low → high**; low pushes toward
self-clear, high toward escalate.

| Dimension | Low risk (toward self-clear) | High risk (toward escalate) |
|---|---|---|
| **Reversibility** | cheap to undo — draft prose, a derived artifact, a tracked file with a cheap revert | destructive, or carrying an actual external side effect (an irreversible publish/release act or data egress). A git-tracked file in a shipped package with a cheap revert is LOW. |
| **Blast radius** | narrow **user-facing** impact — no breaking change, no publish/release act | a breaking user-facing change, or an actual publish/release act. Editing a tracked source file that merely lives in a shipped package, with no breaking change, is LOW. Measured by **user-facing impact, not artifact count** — surface location is not a publish act. |
| **Decision novelty** | trivial / defaulted, or already human-ratified | a new contestable choice the human has not seen |
| **Confidence** | evidence converges; a clean judge pass; no unresolved markers | a marginal verdict; unresolved `<!-- open: -->` markers |

**Breaking-ness is not its own dimension — it splits between the floor and blast radius.**
The signal is the **semver class** (additive/non-breaking vs breaking, measured by
scenario-diff), but breaking-ness never carries a gradient row of its own:

- **Un-authorized narrowing** of an established scenario / published contract is a
  **Clearance** hard-floor case — escalated *above* the gradient, before any dimension is
  scored.
- Once Clearance is granted (pre-authorized in the CR), the **residual** risk of a breaking
  change is just **how far it reaches** — that rides **blast radius** (user-facing breakage).
- **Additive / non-breaking** edits — a new scenario, a new optional path, a clarification
  that does not alter an existing scenario's truth — clear the floor trivially and read
  low. This is what lets a low-risk edit to a frozen spec self-clear rather than forcing a
  full human re-gate; a split/merge that preserves every scenario verbatim self-clears,
  while one that alters or drops a scenario's truth hits Clearance.

## The aggregate verdict

1. **Hard floor first.** If the decision is a clearance, conflict-resolution, or consent
   case → `escalate`, reason `hard floor`. Stop. (Clearance self-clears only against a CR
   pre-authorization; consent only against a recorded opt-in.)
2. **Any single high-risk dimension → `escalate`**, naming that dimension as the dominant
   reason. (One risky dimension is enough.)
3. **All dimensions low → `self-clear`.**

**Weighting — user-facing blast radius is highest.** A **high** user-facing-impact reading
**dominates the aggregate** and forces `escalate` even when every other dimension reads
low. Blast radius stays measured as **user-facing impact** (breaking user-facing changes,
or an actual publish/release act) — **not artifact count** and **not surface location**.

The verdict **always names the dominant dimension / reason** so the consumer sees *why* —
`escalate · blast radius (breaking, published surface)`, `self-clear · all low`, `escalate ·
hard floor (clearance)`.

## A self-cleared verdict is provisional, never final

A self-clear is **provisional** and **agent-attributed** (`by: agent`). It does not make a
decision final: it lands in an **async human review queue** (the set of specs with any
`by: agent`) for ratification. Self-clear advances the work without blocking on a human
in-line, but the human still ratifies the trail. This is what lets the agent lean
autonomous without stealing accountability, and keeps the rubric a design/eval artifact —
the conductor's runtime verdict comes from its own baked-in logic, not from loading the
rubric.

## The leash — the run-level reach over the gates

For the SDD gates the bar is expressed as a **leash**: the furthest gate the agent may
self-assert this run, derived from the dimensions and capped by an optional human ceiling.

| Level | Self-asserts | Stops at |
|---|---|---|
| `auto-none` | nothing | the **spec gate** |
| `auto-spec` | the spec gate | the **impl gate** |
| `auto-all` | both gates | nothing (both provisional) |

The names follow an `auto-<reach>` scheme — they name **how far autonomy reaches**, not
where it stops. Derived: spec gate risky → `auto-none`; spec gate safe, impl gate risky →
`auto-spec`; both safe → `auto-all`. The Conductor may cap the run (`effective =
min(ceiling, derived)`); the agent may stop earlier, never further. The leash is **per
run/sitting** (session-local), held in the `strategy` block, **re-derived at each gate** —
an `auto-none` spec gate does not bind a later impl gate. There is **no per-gate `leash`
field** in an `approval` entry.

## The outer-loop delegates — Scanner escalates, Warden is rubric-subject

The two outer-loop delegates are not symmetric: they differ in *what kind of decision*
each reaches, so they differ in whether the rubric applies at all.

| Delegate | Loop | Decision class | Rubric posture |
|---|---|---|---|
| **Scanner** | doctrine | **intent** — a doctrine/process change alters *how we work* for every future mission | **always escalates**, makes **no self-clear verdict**; stays a less-capable model precisely because it needs no runtime verdict |
| **Warden** | formation | **risk** — structural acts on the spec corpus, gradable per act | **rubric-subject** — a **conductor** that applies the full gradient rubric and makes its own self-clear-vs-escalate verdict per act |

- The **Scanner is intent-class**: a doctrine/process change is the human's to keep or cut;
  it surfaces and stops, drafting always-unratified strategy.
- The **Warden is a conductor**: it self-clears reversible, derivable, low-user-facing-blast
  acts (coverage-preserving refactors, consistency fixes), leaving a provisional
  agent-attributed marker; it escalates destructive acts
  (deprecating a spec in a dedupe), contested acts (picking the winning claim in a
  reconciliation), and breaking changes.

The rule "only the capable conductor makes the verdict" binds to the **conductor role**,
not a loop position: the Warden making its own verdict is consistent because the Warden
*is* a conductor.

## Testability harness

The rubric's verdicts are made testable (vs by-hand vibing) in three layers:

1. **A deterministic helper** (sibling to `check-spec-state.mts`) computes the
   **mechanical** dimensions for a proposed act:
   - **semver class** via scenario-diff (preserved verbatim → non-breaking;
     altered/removed → breaking) — feeds **Clearance** floor detection and the breaking
     weight on blast radius; not a gradient row of its own;
   - **blast radius** — published/installed-surface detection +
     **conformance/alignment coupling** (what conforms to the target);
   - **reversibility** — destructive/cascading op?

   Output: a partial verdict + which dimensions read mechanically-high. The agent judges
   only **novelty** + **confidence** — the helper shrinks the judgment surface to two
   dimensions.
2. **Baked-in logic** (Warden / operator) = helper output + the two judged dimensions,
   run at the formation cadence (Warden per act).
3. **An ACES golden suite** mapping `(act, risk profile) → expected verdict`, run at the
   doctrine cadence over the agent configs to catch posture drift mechanically.

Backstop: provisional markers + the async review queue make "conservative + auditable"
sufficient, not "infallible." The golden suite (deterministic helper cases + golden
verdicts) colocates with this rule or in `../acceptance/`.
