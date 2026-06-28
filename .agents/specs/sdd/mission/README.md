# mission/ — the orchestrator (the operator role / conductor)

`mission/` is the **orchestrator**: the operator role — the **conductor** (the main session by
default; a spawned `sdd-operator` in the headless fallback) — the line officer that runs the
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

## The conductor — the line officer of the inner loop

The **conductor** is the **main (user) session running the operator role**; it sequences one
**segment** (one sitting / run) of a cycle. By default it is **not a spawned agent** — it is
the in-session position that holds the user channel (`../design/specialists-and-squads.md`,
`../design/harness-spawning.md`). Its defining traits:

- **Holds the user channel.** Because the conductor *is* the main session, the **explore grill
  runs live** with the human and the conductor is the **positional ratifier** — it writes the
  human gate verdict directly (`../design/lifecycle-model.md`). It still escalates only at the
  bar the autonomy rubric sets, but it does so **in-session**, not by returning up a relay.
- **Artifacts are the source of truth.** Position is derived from the on-disk artifacts
  (`spec.md`, the `.feature`, frontmatter), never a stored cursor — so any later session (or a
  headless run) resumes by re-reading them plus the plan. This is what makes the mission
  portable, not a property of being respawned.
- **Live loop, no respawn.** The conductor grills, builds, and judges across the segment
  without terminating; `needs-input` is answered **live** by the human in-session. Content gaps
  become durable inline `<!-- open: -->` markers (block Draft→Approved); the iteration cap
  **blocks-and-asks** rather than auto-accepting.
- **Synthesizer.** It sets `aligned` for the gate's layer, writes `by: agent` self-assertions
  and `pause` halts when in-leash, and surfaces non-blocking `OBSERVATIONS` (typed by owning
  lens) without acting on them.

`create-spec` / `validate-spec` / `../authoring/` are **stations the conductor runs in-session**,
never spawned as a `subagent_type` (attempting `subagent_type: validate-spec` fails with "Agent
type not found"). The only things the conductor **spawns** are the **cold judges**, the
**impl-producer builder**, and any **named specialist** producer/judge (below).

**Headless / fan-out fallback.** When there is no live session to host the conductor — an
unattended scheduler, or a multi-CR fan-out spawning one operator per CR — the operator runs as
a **spawned `sdd-operator` subagent** with no user channel: it then escalates only by returning
`complete` / `blocked` / `needs-input` (questions **batched**) up its relay, writes only
`by: agent` self-assertions, and emits a verdict packet on a human gate. This is the depth-2
path and needs a nesting-capable harness (`../design/harness-spawning.md`).

**Segment vs cycle vs iteration.** A **cycle** is one full Mission-Loop pass — one CR
carried to step 4. A **segment** is one sitting / run within a cycle (suspend-and-resume).
**Iteration** is the internal repeat *inside* explore (spec-producer ⇄ spec-judge, spikes)
and deliver (build ⇄ impl-judge) — never the whole loop.

## Resolution — the registry READ

At the start of a segment the conductor reads **only** the project registry
`.agents/universal-plugin.json` (the resolved lockfile — it never scans plugin
directories), matches **each file's** artifact-type (resolution is per file, not one
spec-`type`), and resolves each production-chain role to a plugin delegate or the SDD
default. A project touching several artifact-types summons several squads at once. This
folder owns the **READ / resolution** side only;
the init-WRITE of the lockfile is owned by `../plugin/`, and the registry **shape** by
`../design/specialists-and-squads.md`.

Resolution branches on role kind, and (for producers) on the **role-dependent surface**:

- **Spec / solution-producer** (the live grill) → runs **in-session in the conductor**,
  whether the SDD default (conductor loads the governance and authors inline, recorded
  `produced-by.<role>: sdd:sdd-operator`) or a **named plugin specialist** (persona-loaded
  in-session). It must keep the user channel — it is never spawned.
- **Impl-producer** (mechanical) → the conductor **spawns** a builder: the SDD default spawns a
  generic builder that loads `impl-producer-governance` (`produced-by.impl-producer:
  sdd:sdd-operator`); a named plugin / model-tuned producer spawns that agent at its **own
  model and effort**.
- **Judge, always** → the conductor **spawns a cold agent** in a fresh context
  (`sdd:sdd-spec-judge` / `sdd:sdd-implementer`, or the covering plugin's judge) — never
  inline, regardless of naming.

A required role **always lands on a real delegate** or the conductor **hard-fails closed**
and records nothing (no inline sentinel) — the same fail-closed structural-error class as a
malformed `produced-by` entry or an off-enum combat-log `cause`. A domain claimed by two
plugins returns `needs-input` (answered in-session, or up the relay in the headless fallback);
the choice is written and resume is decisive.

## The production chain

Every act is one of five roles. The dividing line: **producers write artifacts; judges run
a bar and advise** (a judge never writes `spec.md` or the `.feature`). A second line fixes
*where each role runs* (the role-dependent surface): **the conductor authors the spec /
solution-producer inline in the main session** (the live grill); the **impl-producer runs in a
spawned builder** and **every judge runs in a spawned cold context** the author cannot reach.

| Role | Verb | Produces / runs | Writes to | SDD default |
|---|---|---|---|---|
| **spec-producer** | writes the contract | intent prose + boolean Gherkin | `spec.md` body, `.feature` | conductor loads governance, authors **inline (in-session)** |
| **spec-judge** | judges the contract | runs the domain bar on the `.feature` | nothing — advises | `sdd-spec-judge` — spawned cold |
| **solution-producer** | records the solution | the per-unit decision record (chosen approach + rejected alternatives), **only when** the unit has durable rationale | `<unit>.solution.md` (beside the unit's spec + suite) | conductor loads governance, authors **inline (in-session)** |
| **impl-producer** | builds artifact + verification | the implementation **and** one verification per frozen scenario | code/docs/config **+** tests/evals | conductor **spawns a builder** that loads governance |
| **impl-judge** | runs the verification | runs the producer's tests/evals + an orthogonal structural/scope read | nothing — advises | `sdd-implementer` — spawned cold |

The five roles apply three **lenses** (governances, not agents): **Director** (scope),
**Builder** (coverage/testability), **Architect** (structure). Producers self-align to the
lenses; the spec-judge and impl-judge **apply** them backward. There is no "Builder judge"
or "Director agent" — a verdict has a Director-lens face, a Builder-lens face, and an
Architect-lens face.

**Resolution by surface + kind.** For any role the conductor asks: does a plugin cover this
artifact-type, and what surface does the role take? A **spec / solution-producer** runs
**in-session** (SDD default = governance loaded inline; plugin = persona-loaded); an
**impl-producer** is **spawned** (default = generic builder; plugin = its agent); a **judge**
default is a **cold agent spawned**. Tagline: **"the conductor writes the contract live, cold
judges grade."** The constraint that forces the judge split is `producer ≠ judge`, enforced by
context separation: the hand that writes an artifact never signs off on it.

The five artifacts **co-deliver** — produced together, not in sequential gated phases. There
is **no solution gate**: the solution gets no judge of its own and **stays out of the
spec-judge's view**; the implementation's test result validates it transitively (the
conductor's execution `todos` are likewise ungated). Only two objects are gated — the `.feature` (spec gate)
and the implementation (impl gate). The impl-producer co-authors the implementation **and**
its verification (anchored to the frozen scenarios, never free-authored); any
rubric/threshold/score is a validation detail that **never appears in the `.feature`**.

## Explore — build to learn (step 2)

The conductor runs **explore** by running `../authoring/` **in-session**: it authors the
spec-producer inline (the live grill), iterates it against the **cold spec-judge** it spawns,
and **spikes** the impl-producer (in a spawned builder) in `explore` mode against the
**non-frozen** suite to learn what the contract needs. The purpose is to **learn**, so spikes
are thrown away and their **learnings feed the live grill to steer the spec + suite**. A
discovery (the solution needs a behavior the `.feature` omits) routes back as a content-gap +
`OBSERVATIONS`, re-runs the spec-producer, and is **judged before** it can enter the contract —
never absorbed unjudged. The ship-quality impl-judge does not run. The phase ends at the
**spec gate** (Draft → Approved). Explore output is **not pure waste** — a good spike cleans
forward into deliver at the freeze.

`../authoring/` owns the grilling workflow, the spec gate, and freeze; the conductor *runs*
that capability **in-session** (the default, human-interactive through the `../gateway/`) or
autonomously in the headless fallback. One capability, two drive modes.

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
autonomy bar. The conductor **derives the leash** for the gate (the dimension assessment in
`../design/autonomy-rubric.md`) and either **self-asserts within leash** (writes
`approval.impl: { verdict: approve, by: agent, why }` + `aligned`; the spec lands in the
review queue for async ratification) or **stops at the gate** with a verdict packet for the
human. **Never advance** — by self-assertion or human verdict — when any judge reports
failures, any open marker remains, or `aligned` is false; those fail the **confidence**
dimension. Human ratification (`verdict: approve, by: <name>`, advance `status`) is reserved
to the **in-session position** that holds the real user channel — by default the conductor
itself, which writes it directly; a **headless spawned operator** instead emits the verdict
packet and stops, **even when a coordinator relays "the user approved"** — a relayed claim is
not user confirmation.

## In-flight service and the hard floor

The mission serves its own minor work rather than bouncing to the human:

- **Detail-adjustment report (a view of the plan's combat log).** Expansion and minor fixes the
  conductor makes in-flight — clarifying a detail, an obvious stale-mistake correction — are
  recorded as combat-log entries in the plan (see `../design/provenance-model.md`), surfaced as
  a detail-adjustment view, not escalated.
- **Hard-floor escalation (the only mandatory human stops).** Three can fire inside the mission,
  per `../design/autonomy-rubric.md`: **Clearance** of a **narrowing** (weakening/deleting an
  acceptance scenario) — overridable and pre-authorizable in the CR; **Compatibility** when the
  change's **semver class** (patch/minor/major) exceeds the CR/run-mode change-class ceiling —
  likewise pre-authorizable; and **Conflict resolution** of a logical contradiction in the suite
  (Scenario A says yes while Scenario B says no) — *not* pre-authorizable, a defect not a choice,
  the only thing that truly halts implementation unexpectedly. An obvious stale-mistake contradiction
  is a conductor-served minor fix; escalate only when both sides are plausibly intended.
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
   pause is always the agent's act), `cause: dimension | ceiling`, and a `why`
   block that is **durable for every verdict**. `pause` is the accountability-preserving halt
   — "why I halted" is now as durable as "why I went," in the same map. The review queue
   (`approve` / `by: agent`) and awaiting-input queue (`pause`) are both **derived** from this
   map, not stored. A paused gate later passed **overwrites in place** (current-state map; the
   superseded reasoning lives in git).

The conductor writes `approve`/`by: agent` and `pause` verdicts during synthesis; the gate
station writes human ratifications (by default the conductor itself, in-session). No producer
writes `approval`.

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
  (`spec-producer`, `solution-producer`, `spec-judge`, `impl-producer`, `impl-judge`). The
  five-role chain is how the conductor *runs* a squad; "one producer per file" holds because the
  three producer roles write **different** files. A project-spec CR touches several
  artifact-types → summons several squads, each running its five-role chain. No contradiction —
  `../design/specialists-and-squads.md` is canonical.
- **Spec-fleet assumption in the sources — RESOLVED (project-spec model).** The consolidated
  impl gate verifies against **one** suite (`../acceptance/` + colocated unit); the one-suite
  model **stands**. The folded specs that verify against a **per-feature/per-domain `.feature`**
  are the **stale side** — their per-scenario verification language must be re-read against the
  one-suite model in the source sweep, not re-litigated in design.
