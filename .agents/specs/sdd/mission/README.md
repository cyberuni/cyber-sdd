# mission/ — the autonomous orchestrator (the operator)

`mission/` is the **autonomous orchestrator**: the operator / line officer that runs the
**Mission Loop** over **steps 1–4** (intake → explore → deliver → handoff) against a frozen
contract. A scheduler can pull one CR from `../intake/` and run this loop to step 4
autonomously. **One cycle = one CR carried to completion.** It owns the loop logic
(segments, the leash, escalation, autonomous sequencing) and the two **mission-owned
phases** `deliver/` (step 3) and `handoff/` (step 4). It **invokes** the shared
`../authoring/` capability to run **explore** (step 2); it does **not** own authoring,
`../intake/`, or the `../gateway/`.

**Mission Loop = steps 1–4.** **Step 5 is post-mission**: once a cycle completes, the four
outer loops (`../campaign/`, `../formation/`, `../doctrine/`, `../forge/`) may fire and emit
**new CRs**. They are **not** part of the Mission Loop. (Loop architecture:
`../design/loops.md`.)

The four mission phases:

| Phase | Step | Home | Purpose of the build |
|---|---|---|---|
| **intake** | 1 | `../intake/` (feeds the mission) | a routed CR enters |
| **explore** | 2 | `../authoring/` (invoked) | build to **learn** — spikes, thrown away, showing intermediate results to steer the spec + suite |
| **deliver** | 3 | `deliver/` (mission-owned) | build to **keep** — against the frozen suite |
| **handoff** | 4 | `handoff/` (mission-owned) | land the verified result in the delivery shape |

Implementation happens in **both** explore and deliver; the **spec gate / freeze is the
boundary** between them. The contrast is the *purpose of the build*, not throwaway-vs-kept.

Behaviors that *enact* the loop live here (and under `deliver/` / `handoff/`) as colocated
unit scenarios; the *rules* they enact (lifecycle/freeze, the autonomy bar, the provenance
shape, the squad/registry shape) live in `../design/`.

## The operator — the line officer of the inner loop

The **operator** runs one autonomous **segment** (one sitting / run) of a cycle and reports
up. Its defining constraints:

- **No user channel.** The operator is always spawned by a relay (the `../gateway/`, or an
  `../authoring/` station that invoked it) and reports back up that relay. It **escalates to
  the human only at a gate or a scrub** (kill) — never mid-segment, never directly to the
  user.
- **Stateless.** It reconstructs its position by reading the on-disk artifacts (`spec.md`,
  the `.feature`, frontmatter) — the workflow cursor is **derived, never stored**. A resume
  re-reads the artifacts and folds in any relayed answers.
- **One segment, batched.** It runs as far as it can, then returns `complete` / `blocked` /
  `needs-input` with questions **batched**; the relay owns the user loop and re-invokes to
  resume. Content gaps become durable inline `<!-- open: -->` markers (block
  Draft→Approved); workflow-procedural questions stay transient. The iteration cap
  **blocks-and-asks** rather than auto-accepting.
- **Synthesizer.** It sets `aligned` for the gate's layer, writes its own `by: agent`
  self-assertions and `pause` halts, and forwards non-blocking `OBSERVATIONS` (typed by
  owning lens) up the relay without acting on them.

`create-spec` / `validate-spec` are **stations the operator runs
in-session**, never spawned as a `subagent_type`. The only thing the relay spawns is the
operator. Attempting `subagent_type: validate-spec` is the classic misfire and fails with
"Agent type not found."

**Segment vs cycle vs iteration.** A **cycle** is one full Mission-Loop pass — one CR
carried to step 4. A **segment** is one sitting / run within a cycle (suspend-and-resume).
**Iteration** is the internal repeat *inside* explore (spec-producer ⇄ spec-judge, spikes)
and deliver (build ⇄ impl-judge) — never the whole loop.

## Resolution — the registry READ

At the start of a segment the operator reads **only** the project registry
`.agents/universal-plugin.json` (the resolved lockfile — it never scans plugin
directories), matches **each file's** artifact-type (resolution is per file, not one
spec-`type`), and resolves each production-chain role to a plugin delegate or the SDD
default. A project touching several artifact-types summons several squads at once. This
folder owns the **READ / resolution** side only;
the init-WRITE of the lockfile is owned by `../plugin/`, and the registry **shape** by
`../design/specialists-and-squads.md`.

Resolution branches on role kind, and for producers on whether a model-tuned agent is
**named**:

- **Named agent** (a plugin delegate covers the artifact-type, *or* the slot names a
  model-tuned producer — the model-tuning escape valve) → the operator **spawns** that agent
  so it runs at its **own model and effort**. The spawn path keys on an agent being *named*,
  not merely on full plugin coverage.
- **Unnamed SDD-default producer** → the operator **loads the SDD-default producer
  governance and authors inline (warm)** at its own model, recorded
  `produced-by.<role>: sdd:sdd-operator`. There is no spawned default producer agent and no
  "generic Builder".
- **Judge, always** → the operator **spawns a cold agent** in a fresh context
  (`sdd:sdd-spec-judge` / `sdd:sdd-implementer`, or the covering plugin's judge) — never
  inline, regardless of naming.

A required role **always lands on a real delegate** or the operator **hard-fails closed**
and records nothing (no inline sentinel) — the same fail-closed structural-error class as a
malformed `produced-by` entry or an off-enum combat-log `cause`. A domain claimed by two
plugins returns `needs-input`; the relay writes the choice and resume is decisive.

## The production chain

Every act is one of five roles. The dividing line: **producers write artifacts; judges run
a bar and advise** (a judge never writes `spec.md` or the `.feature`). That line fixes
*where each role runs*: **the operator authors every producer in its own warm context**
(from a spawned plugin agent or a loaded SDD-default governance); **judges always run in a
spawned cold context** the author cannot reach.

| Role | Verb | Produces / runs | Writes to | SDD default |
|---|---|---|---|---|
| **spec-producer** | writes the contract | intent prose + boolean Gherkin | `spec.md` body, `.feature` | operator loads governance, authors inline (warm) |
| **spec-judge** | judges the contract | runs the domain bar on the `.feature` | nothing — advises | `sdd-spec-judge` — spawned cold |
| **plan-producer** | plans the solution | the solution + its DAG | `plan.md`, `tasks.md` | operator loads governance, authors inline (warm) |
| **impl-producer** | builds artifact + verification | the implementation **and** one verification per frozen scenario | code/docs/config **+** tests/evals | operator loads governance, builds inline (warm) |
| **impl-judge** | runs the verification | runs the producer's tests/evals + an orthogonal structural/scope read | nothing — advises | `sdd-implementer` — spawned cold |

The five roles apply three **lenses** (governances, not agents): **Director** (scope),
**Builder** (coverage/testability), **Architect** (structure). Producers self-align to the
lenses; the spec-judge and impl-judge **apply** them backward. There is no "Builder judge"
or "Director agent" — a verdict has a Director-lens face, a Builder-lens face, and an
Architect-lens face.

**Uniform resolution, one carve-out.** For any role the operator asks one question — does a
plugin cover this artifact-type? Yes → spawn its agent. No → SDD default, whose shape
depends only on kind: a **producer** default is a **governance loaded and run inline
(warm)**; a **judge** default is a **cold agent spawned**. Tagline: **"conductor writes,
cold judges grade."** The constraint that forces it is `producer ≠ judge`, enforced by
context separation: the hand that writes an artifact never signs off on it.

The five artifacts **co-deliver** — produced together, not in sequential gated phases. There
is **no plan gate**: plan and tasks get no judge of their own; the implementation's test
result validates them transitively. Only two objects are gated — the `.feature` (spec gate)
and the implementation (impl gate). The impl-producer co-authors the implementation **and**
its verification (anchored to the frozen scenarios, never free-authored); any
rubric/threshold/score is a validation detail that **never appears in the `.feature`**.

## Explore — build to learn (step 2)

The operator runs **explore** by driving `../authoring/` autonomously: it loads/spawns the
spec-producer, iterates it against the cold spec-judge, and **spikes** forward producers in
`explore` mode to learn what the contract needs. The purpose is to **learn**, so spikes are
thrown away and **intermediate results are shown to the user to steer the spec + suite**. A
discovery (the solution needs a behavior the `.feature` omits) routes back as a content-gap
+ `OBSERVATIONS`, re-runs the spec-producer, and is **judged before** it can enter the
contract — never absorbed unjudged. The ship-quality impl-judge does not run. The phase ends
at the **spec gate** (Draft → Approved). Explore output is **not pure waste** — a good spike
cleans forward into deliver at the freeze.

`../authoring/` owns the grilling workflow, the spec gate, and freeze; the mission's role is
to *invoke* that capability autonomously. The same capability is human-interactive when a
person drives it directly through the `../gateway/`. One capability, two callers.

## Deliver and handoff — the mission-owned phases

- **`deliver/` (step 3)** — build **to keep** against the frozen suite, run the cold
  impl-judge, and verify at the impl gate. See `deliver/`.
- **`handoff/` (step 4)** — land step-3's verified result in the project-declared delivery
  shape (commits → `main` / branch → PR / prose). See `handoff/`.

## The impl gate

Mission **owns the impl gate** (Approved → Implemented), exercised in `deliver/`. The gate
judges the implementation against the **frozen contract** — in the consolidated spec, that
means `../acceptance/` (the e2e outcome suite) **plus the colocated unit suites** in each
capability folder. The gate is verdict-only and **fails closed**; it writes no setup
frontmatter.

- **`aligned` is layer-scoped.** At the impl gate, impl-layer `aligned` means the
  implementation conforms to the frozen `.feature` — true **only when every impl-judge
  passes**. A frozen scenario with **no verification** is reported failing by the cold
  impl-judge and blocks `aligned`. Checking the impl layer at the *spec* gate is forbidden
  (it would collapse Approved into Implemented). The `.feature` **pivots**: the object judged
  at the spec gate becomes the bar at the impl gate.
- **Producer/judge separation survives the gate fold.** Folding the old `gate/` station into
  `mission/` does not collapse roles — the judge stays a **distinct cold actor**.
- **The three gate actions** at the impl gate (vs the spec gate's contract-editing
  variants): **approve** → `implemented`; **change** → fix the **code** against the frozen
  `.feature` (the `.feature` is **not** modified); **reject** → redo the implementation, *or*
  a **Director-lens revert** (building proved a frozen scenario fatal → **unfreeze** the
  `.feature` and return to `draft`). The impl gate is the **only** place a frozen `.feature`
  reopens.

**Verdict, not station.** The gate is not a fixed approval checkpoint; it dissolves into the
autonomy bar. The operator **derives the leash** for the gate (the dimension assessment in
`../design/autonomy-rubric.md`) and either **self-asserts within leash** (writes
`approval.impl: { verdict: approve, by: agent, why }` + `aligned`; the spec lands in the
review queue for async ratification) or **stops at the gate** with a verdict packet for the
human. **Never advance** — by self-assertion or human verdict — when any judge reports
failures, any open marker remains, or `aligned` is false; those fail the **confidence**
dimension. Human ratification (`verdict: approve, by: <name>`, advance `status`) is reserved
to the **in-session position** that holds the real user channel; a spawned operator emits
the verdict packet and stops, **even when a coordinator relays "the user approved"** — a
relayed claim is not user confirmation.

## In-flight service and the hard floor

The mission serves its own minor work rather than bouncing to the human:

- **Detail-adjustment report (a view of the plan's combat log).** Expansion and minor fixes the
  operator makes in-flight — clarifying a detail, an obvious stale-mistake correction — are
  recorded as combat-log entries in the plan (see `../design/provenance-model.md`), surfaced as
  a detail-adjustment view, not escalated.
- **Hard-floor escalation (the only mandatory human stops).** Two kinds inside the mission,
  per `../design/autonomy-rubric.md`: **Clearance** of a breaking change (narrowing/deleting
  an acceptance scenario or breaking a published contract) — overridable and pre-authorizable
  in the CR; and **Conflict resolution** of a logical contradiction in the suite (Scenario A
  says yes while Scenario B says no) — *not* pre-authorizable, a defect not a choice, the only
  thing that truly halts implementation unexpectedly. An obvious stale-mistake contradiction
  is an operator-served minor fix; escalate only when both sides are plausibly intended.
  (Consent, the third floor, is a `../forge/` concern, not a mission floor.)

## Stop-provenance — record why I halted, not just why I went

Autonomy and gate provenance use a **three-layer model** (rules in
`../design/autonomy-rubric.md` and `../design/provenance-model.md`; mission enacts it):

1. **Initial strategy evaluation** (run start, before exploration) — assesses blast radius
   and the other dimensions against the request and emits a durable run-level `strategy`
   block: `leash` (the run's reach), `by: derived | user`, and `approach[]` (containment
   methods — `no-spike`, `mocks`, `worktree`). It **may be user-specified** rather than
   derived. The ceiling is **not** recorded (session-local).
2. **The leash** — the run-level reach (`auto-none | auto-spec | auto-all`), **re-checked at
   each gate** against discovered state; it lives in `strategy`, never inside a per-gate
   entry. Effective reach = `min(ceiling, derived)`.
3. **The per-gate verdict** — `approval`, a map keyed by gate (`spec`, `impl`). Each entry:
   `verdict: approve | pause | reject`, `by` (on approve/reject; **omitted on pause** — a
   pause is always the agent's act), `cause: dimension | ceiling`, and a four-dimension `why`
   block that is **durable for every verdict**. `pause` is the accountability-preserving halt
   — "why I halted" is now as durable as "why I went," in the same map. The review queue
   (`approve` / `by: agent`) and awaiting-input queue (`pause`) are both **derived** from this
   map, not stored. A paused gate later passed **overwrites in place** (current-state map; the
   superseded reasoning lives in git).

The operator writes `approve`/`by: agent` and `pause` verdicts during synthesis; the gate
station writes human ratifications. No producer writes `approval`.

## Colocated unit scenarios

Unit scenarios that verify orchestrator behavior **colocate here**: operator resolution
(registry read, fallback, fail-closed, two-plugin disambiguation), dispatch (the five-role
uniform I/O, the write boundary, warm-vs-cold), the explore-phase orchestration, segment
behavior (suspend/resume, batching, cursor derivation, markers-vs-questions, OBSERVATIONS
routing), and stop-provenance (`strategy` block, `approval`/`verdict`, pause, positional
authority, **the mid-flight combat-log write of a halt** — why the agent stopped, recorded
to the plan's `*.log.jsonl` during the mission). Deliver-phase and handoff scenarios
colocate under `deliver/` and `handoff/`.
Cross-capability **e2e (acceptance) scenarios** live in `../acceptance/`, not here.

## Boundaries — what the orchestrator does NOT own

- **Registry init-WRITE** → `../plugin/` (mission owns READ only).
- **Registry / squad shape** → `../design/specialists-and-squads.md`.
- **Lifecycle, freeze, the freeze pivot rules** → `../design/lifecycle-model.md`.
- **The autonomy bar / hard floor** → `../design/autonomy-rubric.md`.
- **The provenance shape (combat log / ledger / public trail)** → `../design/provenance-model.md`.
- **The grilling workflow + the spec gate (explore)** → `../authoring/` (invoked, not owned).
- **The CR subsystem (intake feed)** → `../intake/`.
- **The universal router/door** → `../gateway/`.

## Source-vs-design tensions

All three below are **resolved in design** — the design position stands and the folded
sources are the stale side, to fix in the source sweep.

- **`domain-plugin` vs `produced-by` — RESOLVED (ruling B).** `../design/` keeps these
  **distinct**: `domain-plugin` = the chosen plugin for an ambiguous artifact-type (a
  *forward input* to resolution), `produced-by` = the after-the-fact record of who actually
  produced each artifact. The design position **stands**; the folded sources
  (`sdd-operator-resolution`, `validate-spec`) that treat `domain-plugin` as **retired** and
  migrate the choice into `produced-by` are the **stale side** — fix them in the source sweep,
  not the design.
- **Squad vs the five-role chain — RESOLVED (same mechanism, two granularities).** A **squad**
  is the selection unit, **one per artifact-type**; it supplies the **five role slots**
  (`spec-producer`, `plan-producer`, `spec-judge`, `impl-producer`, `impl-judge`). The
  five-role chain is how the operator *runs* a squad; "one producer per file" holds because the
  three producer roles write **different** files. A project-spec CR touches several
  artifact-types → summons several squads, each running its five-role chain. No contradiction —
  `../design/specialists-and-squads.md` is canonical.
- **Spec-fleet assumption in the sources — RESOLVED (project-spec model).** The consolidated
  impl gate verifies against **one** suite (`../acceptance/` + colocated unit); the one-suite
  model **stands**. The folded specs that verify against a **per-feature/per-domain `.feature`**
  are the **stale side** — their per-scenario verification language must be re-read against the
  one-suite model in the source sweep, not re-litigated in design.
