# mission/ — the orchestrator (the conductor)

`mission/` is the **orchestrator** — the **conductor** (the main session by
default; a spawned `automaton` in the headless fallback) — the line officer that runs the
**Mission Loop** over **steps 1–4** (intake → explore → deliver → handoff) against a frozen
contract. A scheduler can pull one CR from `../intake/` and run this loop to step 4
autonomously. **One cycle = one CR carried to completion.** It owns the loop logic
(segments, the leash, escalation, autonomous sequencing) and the two **mission-owned
phases** — **deliver** (step 3) and **handoff** (step 4). It **invokes** the shared
`../authoring/` capability to run **explore** (step 2); it does **not** own authoring,
`../intake/`, or the `../gateway/`.

> **This README is a `descriptive` capability overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type` marker,
> no `.feature`, and no `## Use Cases`; each behavior lives in a **behavioral** unit spec below,
> where the use cases map to that unit's suite. (Only a behavioral node carries `## Use Cases`; a
> descriptive index carries none.)

**Mission Loop = steps 1–4.** **Step 5 is post-mission**: once a cycle completes, the four
outer loops (`../campaign/`, `../formation/`, `../doctrine/`, `../forge/`) may fire and emit
**new CRs**. They are **not** part of the Mission Loop. (Loop architecture:
`../design/loops.md`.)

The four mission phases:

| Phase | Step | Home | Purpose of the build |
|---|---|---|---|
| **intake** | 1 | `../intake/` (feeds the mission) | a routed CR enters |
| **explore** | 2 | `../authoring/` (invoked) | build to **learn** — spikes, thrown away, showing intermediate results to steer the spec + suite |
| **deliver** | 3 | `delivery.md` + `impl-producer/` + `impl-judge/` (mission-owned) | build to **keep** — against the frozen suite |
| **handoff** | 4 | `handoff/` (mission-owned) | land the verified result in the delivery shape |

Implementation happens in **both** explore and deliver; the **spec gate / freeze is the
boundary** between them. The contrast is the *purpose of the build*, not throwaway-vs-kept.

## The conductor — the line officer of the inner loop

The **conductor** is the **main (user) session**; it sequences one
**segment** (one sitting / run) of a cycle. By default it is **not a spawned agent** — it is
the in-session position that holds the user channel (`../design/specialists-and-squads.md`,
`../design/harness-spawning.md`). The full behavior — resolution, the production chain, explore
orchestration, the impl gate, stop-provenance, segment mechanics, the in-flight floor — is the
[`conductor/`](./conductor/README.md) unit spec. Its defining shape:

- **Holds the user channel.** Because the conductor *is* the main session, the **explore grill
  runs live** with the human and the conductor is the **positional ratifier** — it writes the
  human gate verdict directly. The **headless / fan-out fallback** is the spawned `automaton`
  subagent with no user channel (it escalates by returning up its relay); that depth-2 path is
  the [`conductor/`](./conductor/README.md) unit's headless variant.
- **Artifacts are the source of truth.** Position is derived from the on-disk artifacts
  (`spec.md`, the `.feature`, frontmatter) plus the plan — never a stored cursor — so any later
  session (or a headless run) resumes by re-reading them. This is what makes the mission
  portable, not a property of being respawned.

**Segment vs cycle vs iteration.** A **cycle** is one full Mission-Loop pass — one CR carried to
step 4. A **segment** is one sitting / run within a cycle (suspend-and-resume). **Iteration** is
the internal repeat *inside* explore (spec-producer ⇄ spec-judge, spikes) and deliver
(build ⇄ impl-judge) — never the whole loop.

## Units

This capability's behavior is realized by the **conductor** plus the
**solution-producer** it runs inline. The unit of test is the skill — **one `.feature` per
unit**, named for the unit and colocated with the unit's spec in its own folder. The freeze grain
is **per `.feature` file**. Cross-capability outcome (e2e) scenarios live in `../acceptance/`,
never here.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **conductor** | behavioral | [`conductor/`](./conductor/README.md) | the conductor role — *orchestrating* resolution (it runs the `resolution/` matcher and composes the bars), the five-role production chain, explore orchestration, the impl gate, stop-provenance, segment mechanics, the in-flight floor; **realized in-session by default, by the spawned `automaton` in the headless fallback** |
| **resolution** | behavioral | [`resolution/`](./resolution/README.md) | the registry **READ** — match the resolved-actor bars for an artifact-type and name each role's agent, returned **bucketed by tier** for the agent to compose; the `resolve-governances` matcher engine |
| **solution-producer** | behavioral | [`solution-producer/`](./solution-producer/README.md) | the `solution-producer-governance` procedure — record the per-unit solution (chosen approach + rejected alternatives) **only when** a unit carries durable rationale; ungated, no judge of its own |

The mission-owned **phases** (flat at `mission/`, capped at two levels):

- **deliver (step 3)** — build **to keep** against the frozen suite, run the cold impl-judge, verify
  at the impl gate. Overview in [`delivery.md`](./delivery.md); its producer≠judge pair are direct
  mission units, [`impl-producer/`](./impl-producer/README.md) + [`impl-judge/`](./impl-judge/README.md)
  (grouped by `concept: delivery`, not a folder).
- **[`handoff/`](./handoff/README.md) (step 4)** — land step-3's verified result in the
  project-declared delivery shape (commits → `main` / branch → PR / prose).

## Where the rules live

Behaviors that *enact* the loop live in the unit specs here (`impl-producer/`, `impl-judge/`,
`handoff/`, …); the
*rules* they enact live in `../design/`: lifecycle / freeze / the freeze pivot in
`lifecycle-model.md`, the autonomy bar / hard floor in `autonomy-rubric.md`, the provenance shape
(combat log / ledger / public trail) in `provenance-model.md`, the squad / registry shape in
`specialists-and-squads.md`. The unit specs **reference** those rules; they do not restate them.

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

- **The contested-type choice vs `produced-by` — RESOLVED (ruling B).** `../design/` keeps these
  **distinct**: the contested-type → chosen-plugin disambiguation = the chosen plugin for an
  ambiguous artifact-type (a *forward input* to resolution, recorded as `.agents/sdd/` resolution
  state, decisive on resume), `produced-by` = the after-the-fact record of who actually produced
  each artifact. The distinctness **stands** — never **conflate** them; migrating the choice into
  `produced-by` was the original blocker. The old root-spec.md `domain-plugin` frontmatter field is
  **retired**: the choice lives in `.agents/sdd/`, not frontmatter (`../design/artifact-type.md`).
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
