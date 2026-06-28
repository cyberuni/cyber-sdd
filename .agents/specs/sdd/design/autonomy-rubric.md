# Autonomy rubric — the self-clear-vs-escalate bar

This rubric is the single self-clear-vs-escalate arbiter for **every SDD autonomy decision** — every write to the spec/suite, each gate's self-assertion (via the leash), and every outer-loop delegate act (including the forge loop's opt-in egress, the Consent floor).
There is **no mandatory approval station**: the initial CR-grilled diff and every in-flight adjustment go through this one rubric, which decides `self-clear` or `escalate`.
The human is an **escalation target the bar invokes**, not a fixed checkpoint — humans decide *what to build* by raising the CR and reading the outcome, not by gating each transition.

The rubric **defines** the bar; the conductor **enacts** it.
It is a **design/evaluation artifact**, not a runtime monolith loaded on every decision.
At design/eval time the consumer is the eval tool (ACES), which sets and verifies each agent config's escalation posture against it.
At runtime the verdict is made by the **conductor** — the capable position that runs a loop and makes its self-clear/escalate verdicts from baked-in logic (in SDD the **main session running the operator role**, or a spawned `sdd-operator` in the headless fallback; the formation Warden is another) — authored to conform to this rubric, never by loading the document per decision.
An agent's baked-in logic carries only the inputs its own decisions touch.

## The hard floor — the only mandatory human escalations

The hard floor is checked **first** and is **not score-based**.
A high computed confidence never unlocks it; the floor sits above the gradient entirely.
**Four kinds** (the mnemonic: four **C**'s):

| Floor | Fires at | Trigger | Human decision | Pre-grantable? |
|---|---|---|---|---|
| **Clearance** | spec gate / impl gate | the diff **narrows or deletes** an existing (frozen / e2e) scenario — the suite now guarantees **less** | grant clearance to narrow | **Yes** — pre-authorizable in the CR (stated, or acknowledged during grilling), so it need never halt mid-flight |
| **Conflict resolution** | impl gate | the suite **contradicts itself** — two scenarios at odds with **no intended winner** | pick which scenario is intended | **No** — a discovered defect, not a grantable permission |
| **Compatibility** | spec gate / impl gate | the change's **semver class** — **patch** (fix) / **minor** (feature) / **major** (breaking) — **exceeds the authorized ceiling** | authorize the class (or defer) | **Yes** — the CR / run-mode change-class sets the ceiling up front |
| **Consent** | **forge loop** | the cross-installation field loop wants to **run or report** — **data egress** of correction records | opt in (explicit, default-off, revocable) | **Yes** — granted up front |

- **Clearance — the narrowing case.**
  The gate finds the diff **weakens or deletes** an existing (frozen / e2e) scenario, so the suite guarantees less than before; the human grants clearance to narrow.
  A **new** scenario that contradicts an old frozen one is also Clearance (a clear intended winner — the new replaces the old), not Conflict.
  (Whether a change is *also* a breaking change in product / semver terms is the **Compatibility** floor below, not Clearance — the two can co-fire.)
- **Conflict resolution** is the only thing that truly halts work **unexpectedly** — reduce it by grilling harder at authoring.
  An obvious stale-mistake contradiction is a conductor-served minor fix; escalate only when both sides are plausibly intended.
- **Compatibility — the semver class.**
  The change is classified **patch** (fix) / **minor** (feature) / **major** (breaking) — mechanically from the scenario / API-diff, and **judged** by the resolved **Builder** governance for un-contracted user-facing change (a UI restyle's class is the designer-as-Builder's call), **domain-relative** (a design-system library is stricter than an app).
  The floor fires when the class **exceeds the authorized ceiling** (below); at or under it, the change self-clears.
  Clearance (narrowing) and Compatibility (class) are distinct and can co-fire — removing a published guarantee is both.
- **Consent** is the **only execution-side floor** — opt-in egress in the **Forge loop** (`../forge/`).
  SDD does **not** publish / release / deploy (those are downstream SDLC, externally guarded — e.g. a marketplace publish is a PR behind auth and review); **the rubric does not re-gate what already has its own guard.**
- Symmetry: **Conflict resolution** alone **cannot be pre-granted**; the other floor acts can.

**Everything additive / internal / minor self-clears.**

### Pre-authorization (payable in advance)

**Clearance**, **Compatibility**, and **Consent** are **payable in advance** — pre-authorized in the CR — so they never halt mid-flight: a planned scenario narrowing (Clearance), the authorized change-class ceiling (Compatibility), an opt-in to egress (Consent).
A declared **destructive operational act** (e.g. resetting external test data) is likewise pre-authorizable, else it escalates; the inner loop has no other irreversibility concern (everything SDD writes is git-reversible).
**Conflict resolution** cannot be pre-granted — it is a discovered defect, not a permission.

The **change-class ceiling** (Compatibility) is set by the CR or a **run-mode** in the `strategy` block — the highest semver class the run may self-clear:

- `bug-fix-only` → ceiling **patch** (minor / major escalate);
- **default** → ceiling **minor** (additive / non-breaking self-clears);
- `expected-breaking` → ceiling **major**;
- `analyze-and-defer-breaking` → a detected **major** is deferred as a **new CR**, not done this run.

## The gradient — three dimensions, two modulate and one decides

Below the floor the bar reads three dimensions.
Two **modulate** (they set how much evidence a self-clear needs); one **decides**.

| Dimension | Role | Low | High |
|---|---|---|---|
| **Blast radius (magnitude)** | modulator | few, peripheral artifacts | many artifacts, or **central / sensitive** ones (high dependency fan-in, marked-sensitive paths). Measured by the **scope and sensitivity of what's touched** — **not** compatibility/breakage (a separate concern), **not** mere surface location. |
| **Novelty** | modulator | trivial / defaulted, or already human-ratified | a new contestable choice the human has not seen |
| **Confidence** | **decider** | evidence converges; a clean judge pass (which already reflects the resolved **Builder** bar — e.g. any coverage / mutation threshold that artifact-type requires); no unresolved markers | a marginal verdict; unresolved `<!-- open: -->` markers |

**Why git-reversibility is not a dimension.**
SDD produces tracked artifacts, so inner-loop work is cheap to undo — that is the **autonomy license** (the reason self-clear can lean permissive), a constant baseline, not a per-decision signal. Genuinely irreversible acts are either the **Consent** floor (egress) or **pre-authorized** (destructive ops); externally-guarded SDLC acts are out of scope.

## The aggregate verdict

1. **Hard floor first.**
   A clearance (narrowing), conflict-resolution, compatibility (class over the authorized ceiling), or consent case — unless pre-authorized — → `escalate`, reason `hard floor`.
   Stop.
2. **Else, confidence decides — blast and novelty raise the bar.**
   A larger blast or a more novel choice demands stronger evidence (a clean judge pass, no open markers, converging analysis).
   They **never independently escalate**.
3. **High confidence (given the modulators) → `self-clear`** (provisional).
   **Marginal → `escalate`.**

There is **no weighting or scoring**: the floor is a hard trigger; below it, confidence is a single integrated judgment that blast and novelty inform.
The verdict **always names its driver** so the consumer sees *why* — `escalate · hard floor (clearance)`, `self-clear · high confidence (large but clean refactor)`, `escalate · low confidence (novel choice, unresolved markers)`.

## A self-cleared verdict is provisional, never final

A self-clear is **provisional** and **agent-attributed** (`by: agent`).
It does not make a decision final: it lands in an **async human review queue** (the set of specs with any `by: agent`) for ratification.
Self-clear advances the work without blocking on a human in-line, but the human still ratifies the trail.
Leaning autonomous is safe precisely because inner-loop work is **git-reversible** and every self-clear is **async-ratified** — the agent gains reach without stealing accountability, and the rubric stays a design/eval artifact (the conductor's runtime verdict comes from its own baked-in logic, not from loading the rubric).

## The leash — the run-level reach over the gates

For the SDD **gates** the bar is expressed as a **leash**: the furthest gate the agent may self-assert this run, derived from the verdict and capped by an optional human ceiling.

| Level | Self-asserts | Stops at |
|---|---|---|
| `auto-none` | nothing | the **spec gate** |
| `auto-spec` | the spec gate | the **impl gate** |
| `auto-all` | both gates | nothing (both provisional) |

The names follow an `auto-<reach>` scheme — they name **how far autonomy reaches**, not where it stops.
Derived: spec gate would escalate → `auto-none`; spec gate self-clears, impl gate would escalate → `auto-spec`; both self-clear → `auto-all`.
An optional **human ceiling** caps the run (`effective = min(ceiling, derived)`); the conductor may stop earlier, never further.
The leash is **per run/sitting** (session-local), held in the `strategy` block, **re-derived at each gate** — an `auto-none` spec gate does not bind a later impl gate.
There is **no per-gate `leash` field** in an `approval` entry.
The leash governs only the **two gates**; non-gate decisions (in-flight adjustments, outer-loop acts) run the floor + gradient directly.

## Who applies the bar

The bar is a **verdict, made only by a conductor** — never a checklist a lesser agent runs.
A delegate that merely **surfaces** a finding for a human keep-or-cut (e.g. the doctrine-loop **Scanner**, which drafts unratified strategy) makes no verdict, so it can be a lesser model.
A delegate that **acts** under the bar (e.g. the formation-loop **Warden**, self-clearing or escalating each structural act) **must** be a conductor.
Per-loop behavior lives in `loops.md` and each loop's folder.

## Testability harness

The rubric's verdicts are made testable (vs by-hand vibing) in three layers:

1. **A deterministic helper** (sibling to `check-spec-state.mts`) computes the **mechanical** inputs for a proposed act:
   - **Clearance detection** — **scenario-diff** (a scenario preserved verbatim → no narrowing; a scenario altered / removed / narrowed → fires Clearance);
   - **Compatibility class** — the **semver class** from the scenario / API-diff (mechanical); un-contracted user-facing change is left for the **Builder** judged read;
   - **blast radius (magnitude)** — **artifact count × centrality/sensitivity** (dependency fan-in, marked-sensitive paths) — **not** surface location.

Output: which floor cases fire (and the detected class vs the ceiling) + the blast magnitude.
The agent judges the **Builder** class read (un-contracted change), **novelty**, and **confidence** — the helper shrinks the judgment surface to those.
2. **Baked-in logic** (Warden / conductor) = helper output + the judged inputs, run at the relevant cadence (Warden per formation act).
3. **An ACES golden suite** mapping `(act, risk profile) → expected verdict`, run at the doctrine cadence over the agent configs to catch posture drift mechanically.

Backstop: provisional markers + the async review queue make "conservative + auditable" sufficient, not "infallible."
The golden suite (deterministic helper cases + golden verdicts) colocates with this rule or in `../acceptance/`.
