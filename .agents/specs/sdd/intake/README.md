# intake/ — the CR subsystem

The **change request (CR)** is the **unit of change-intent** — step 1 of the Mission Loop and
the top of the SDD stack. Everything SDD **acts on** enters as a CR, and nothing re-enters
except as a CR; a **task that is not a CR escapes** (below). `intake/` is the **CR
subsystem**: it owns the CR concept, its **sources** (prompt / Asana / Jira / Linear /
GitHub / a local store), the **escape hatch** (the task-vs-CR boundary), and the **inject
channel** (zoom into a single inner-loop agent). It
**feeds** missions — it is not "step 1 inside the mission"; a scheduler pulls a CR from here
and runs the Mission Loop (`../mission/`) to step 4. All sources reach the project through
the universal `../gateway/`.

## The CR is the unit of change-intent

The CR sits at the **top of the SDD stack** (`../design/sdd-stack.md`) — it is **intent**, not an
abstraction of the project below it: the source that **drives** a plan, then the spec + suite deltas,
and from there the implementation and outcome.

A CR is therefore not a feature, a spec, or a flag bolted onto a spec — it is the
**intent**. It carries `what` and `why` (free text; `why` may optionally cite a combat-log
correction as a loose pointer, never a copy). The grilling that turns a CR into spec+suite
deltas happens in `authoring/`, which owns the spec gate; the CR itself is pre-grill intent.

**"Unit of change-intent," not "unit of work."** The CR is the unit SDD *takes in* — one
coherent intent to grill. It is **not** the commit-level *unit of work* (one co-committable
change with a clear message and green tests); a single CR's mission lands as **many** such
commits. The CR scopes *what to build*; the commit scopes *what lands together*. SDD never
requires TDD ordering inside a commit — an agent may plan, build, and write several tests at
once, then co-commit them as one unit of work.

The unit is the **project**, not the feature: one durable spec, one behavior suite, one
gate/freeze baseline. A CR produces *deltas* to that single corpus — it never spawns a new
sibling spec to gate. Size is handled by organizing into files/folders, not by splitting
into smaller specs to approve separately.

## Intake scaffolds the mission plan

Step 1 produces two things, not one: the **routed CR** and a **scaffolded mission plan**.
When a CR is claimed, intake creates `.agents/plans/<cr-ref>.plan.md` from a **basic template**
— Cursor-compatible frontmatter with an empty `todos` list (`../design/provenance-model.md`)
plus a `## NEXT` anchor — so the plan exists **from step 1**. The **conductor** then **fills**
it during explore (the task DAG flattened to `todos`, the working method, progress); it does
**not** invent the plan from nothing later. The plan holds **execution state only** — the
durable per-unit **solution** (chosen approach + rejected alternatives) lives beside each
unit's spec + suite, not here (`../design/spec-structure.md`). A plan that already
exists (a resumed mission) is opened, not re-scaffolded.

## Units

`intake/` is a **descriptive** subsystem index (no `spec-type` marker, no `.feature`); each testable
behavior lives in a **behavioral** unit spec below. The unit of test is the skill — **one `.feature`
per unit**, colocated with the unit's spec in its own folder.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **plan-discovery** | behavioral | [`plan-discovery/`](./plan-discovery/README.md) | find the resumable missions by their plan briefs under `.agents/plans` — a present `*.plan.md` is an unretired mission; read frontmatter + the `## NEXT` lead only, tally its todos, emit a TOON list; the **gateway** runs it on entry to offer resume |
| **resolve-durability** | behavioral | [`resolve-durability/`](./resolve-durability/README.md) | resolve one artifact's durability signal (durable/non-durable) — explicit override, then the optional `.agents/sdd/durability.toml` universal table, then the fixed agent-config kind default, then fail-closed to durable; the **conductor** runs it at intake, before a task becomes a CR |

The CR **sources** adapter and the local CR **store** are deferred net-new units (see the open
marker below); they are not yet behavioral specs.

## Sources — the only work-intake

A CR may originate from any source; the source is the carrier, never a different kind of
work. CR intake is *the only* work-intake in the loop.

| Source | Carrier |
|---|---|
| **human prompt** | a request typed directly to the gateway |
| **Asana** | a task, via `cyber-asana` |
| **Jira** | an issue, via a Jira adapter |
| **Linear** | an issue, via a Linear adapter |
| **GitHub** | an issue, via the `create-issue` / `link-pr-to-task` skills |
| **local store** | a CR persisted in-repo (candidate: a `bd` / beads integration) |

The agent operates each source **natively** — it already knows how to pick up a GitHub
issue, branch, open a PR, and close the issue; move an Asana task; transition a Jira issue;
claim a beads bead. SDD therefore does **not** wrap a source in a CRUD / data-access layer.
The **adapter is thin** — a **directive**, not a backend abstraction. It states *which*
source(s) this project draws CRs from, any project-specific convention for using one (labels,
projects, required fields), and — when a project draws from several — how they are
orchestrated. Where there is no external tracker, a **local store** (candidate: a `bd` /
beads integration) persists the CR body and status in-repo; that store is the one place SDD
itself owns CR persistence.

**Status is the source's own `open → accepted → done`** — read and moved *natively*, not an
SDD-invented state machine and not copied into the internal provenance or `spec.md`
frontmatter. The `cr` id is the only join between the source (intent + status) and the
internal provenance (the ledger's work history, keyed by `cr`); neither duplicates the other.

**Claiming a CR is the coordination lock.** Before a mission starts, it **claims** the
source record (assigns the issue / moves the task to in-progress → `accepted`) so no second
mission picks the same CR. This is the CR-granularity complement to git's file-granularity
locking (`../design/cr-concurrency.md`): git keeps two trees from colliding on the
same *file*; the source-claim keeps two trees from grabbing the same *CR*.

**Write-back at handoff is conditional, never bookkeeping.** When delivery is a **PR** (the
common case), the PR closes the source on merge (`Closes #N`) — SDD adds no separate close.
When work lands **directly on `main`**, the mission transitions the source to `done` on
push. Either way the mission may **report back** to the source — findings, and **follow-up
tasks**, which re-enter SDD as **new CRs** (the same outer-loop → intake closure).
Report-back is outward, human-facing provenance, distinct from the internal combat-log
`report` lines.

<!-- open: The thin adapter directive (source selection + per-source convention +
multi-source orchestration) and the local CR store (on-disk CR body + open→accepted→done
status; candidate: a `bd` / beads integration) are **new work** — each needs its own
colocated spec + suite that does not exist yet. -->

Every actor is a requester through the same adaptor — no requester is privileged. The four
**outer loops** (campaign / formation / doctrine / forge) are CR-generators: a
retrospective finding becomes a **new CR**, which is how the outer loops close back onto the
single intake. A human raises a CR by deciding *what to build*; a loop raises a CR by
finding what should change next.

## Escape hatch — the task vs CR boundary

An agent receives **tasks**; **not every task is a CR.** "Is this a CR?" is the same
question as **"should SDD engage at all?"** — so the determination is logically *prior* to
SDD: a task that is not a CR need never load SDD. The escape hatch exists because that
determination must **also** be handled *inside* a loaded SDD — tasks arrive while SDD is
already running, and SDD must recognize the ones that are not its work and let them
**escape** rather than force empty ceremony (a draft with no freezable scenarios, a gate
with nothing to judge).

**Recognition is grill + impact analysis, not an up-front classifier.** When a task reaches
a loaded SDD it gets the normal grilling and impact analysis; if that finds **no
suite-relevant behavior**, the task escapes. The same analysis can **discover a CR within or
related to** a task — then that behavioral part is carved out as a CR and the remainder
escapes. There is no separate recognition machine at the door: the gateway is only the door
(`../gateway/`); the determination is the grill.

**Durability is a second, independent escape trigger.** Behavior alone is not the only
question — SDD is built for **durable** work (a public surface, or part of the solution of
one), and forcing spec+suite ceremony onto **non-durable** work (a private scaffold, a POC, an
ad hoc internal tool/script) is the same empty-ceremony problem the escape hatch already
exists to avoid. A task with real suite-relevant behavior still escapes when its **durability
signal** resolves non-durable. Durability resolves the way `artifact-type` does — per artifact,
convention first (`../design/artifact-type.md`) — but unlike artifact-type's ambiguity path
(which **asks** the user, confirm-never-guess), an unresolved durability signal never asks:
it **fails closed to durable** (step 4 below) and the work proceeds as a normal CR. The
convention differs by kind, and an explicit statement always wins:

1. **Explicit override in the request wins first.** If the requester states durability
   directly ("this is a throwaway POC", "this must be public") that decides it; no further
   resolution runs.
2. **Else a project-declared `.agents/sdd/durability.toml` entry, if the artifact's path
   matches.** An optional, mutable TOML map, shape `"<path-or-glob>" = "durable" |
   "non-durable"`, the same optional / last-write-wins lookup-table convention as the
   artifact-type tiebreaker map. This is the **universal override valve** — usable for
   *any* artifact-type's durability, not code-only: a project whose project-private skills
   are in fact a maintained contract for its contributors can add
   `".agents/skills/" = "durable"` and override the agent-config default below.
3. **Else the artifact's own kind default:**
   - **Multi-instance agent-config artifact-types** (`skill`, `subagent`, `command` — each has
     many files across many possible locations) — a **fixed** location convention: user-global
     and project-private paths are non-durable; project-public (shipped) paths are durable.
     This is a low-friction default, not a project-specific guess — it already matches how
     `define-skill` / `define-agent` / `create-skill` ask placement today.
   - **`agents-section` and code artifact-types** (scripts, tools, POC code, …) have **no kind
     default**: `agents-section` is a section of one AGENTS.md, not a location-varying
     artifact-type, so no fixed convention applies to it; code has no universal
     `tools/`-vs-`src/` split across projects. Absent a matching `durability.toml` entry, both
     fall through to step 4.
4. **No resolvable signal → durable (fail closed).** Absent an override, a matching
   `durability.toml` entry, and a kind default, durability is **not** guessed non-durable —
   it defaults durable and the task proceeds as a normal CR, mirroring "ambiguity defaults
   to a CR" below. A silent false-negative (something durable escaping unrecorded) is the
   one failure mode this hatch must never produce; a false positive (something non-durable
   going through full SDD) only costs one CR's ceremony.

A non-durable resolution **escapes outright** — no CR, no draft, no gate, no combat-log
record — the same as a task with no suite-relevant behavior. This is deliberately **not** the
trivial-CR self-clear below: durability escapes by *surface*, regardless of risk; a risky
change confined to a non-durable surface still escapes, because the question durability
answers is "does this ever need to stay in sync as a contract," not "how risky is this diff."

**Escaped work leaves no SDD record.** A non-CR task is not SDD's to track; a change that
touches `spec.md` prose but not the suite — a typo, a reflowed sentence — is already
recorded by **git history**, which needs no manual journal. So escape writes **no draft, no
gate line, no combat-log entry** — it is *stated* in the moment, then done by ordinary means.

**Escape is not the trivial-CR self-clear.** A genuinely behavioral, **durable-surface**
change that merely reads low-risk is a **CR that self-clears** the gates (with full
provenance) — *not* an escape.
The litmus is whether the change can affect observable behavior or break the suite:

| Work | Escapes? | Why |
|---|---|---|
| Fix a typo in `spec.md` prose | **Yes** — no record | no behavior; git is the record |
| A task unrelated to the project's behavior | **Yes** — no record | not a CR; SDD never owned it |
| **Move a folder** | **No** — it is a CR | breaks import paths → re-verified at the impl gate |
| A small but real behavior change **on a durable surface** | **No** — it is a CR | self-clears the gates (low risk), keeps full provenance |
| A private (user-global / project-private) skill or agent definition | **Yes** — no record | agent-config durability resolves fixed-location non-durable |
| A public (shipped) skill or agent definition | **No** — it is a CR | agent-config durability resolves fixed-location durable |
| A script/tool matching the project's declared non-durable location | **Yes** — no record | code durability resolves via the project's own config |
| A private skill/agent whose path matches a `durability.toml` "durable" entry | **No** — it is a CR | project override beats the fixed agent-config default |
| Any of the above, explicitly declared the opposite in the request | follows the declaration | explicit override wins over the location default |

The corpus-reorganization cases the original escape hatch listed — split/merge, relocate a
contract, regenerate views, reorganize folders — are **no longer escapes**: per ruling E and
`../design/project-unit.md`, intra-project reorg is **plain editing** and
cross-project corpus acts are **gated lifecycle acts** owned by `../formation/` and
`../corpus/`. Meta-work that changes SDD-plugin *behavior* (a lifecycle transition rule →
"given status X, transition Y is rejected") is a freezable scenario → a **CR**, never an
escape.

**Ambiguity defaults to a CR.** If grilling cannot positively clear a task of behavior,
treat it as a CR and explore; the cost of a false positive is one cheap explore pass that
finds nothing, never an untracked behavior change.

<!-- open: Promotion path — when a durability-escaped artifact later moves to a durable
surface (e.g. a project-private skill is published), nothing currently detects the missing
spec/suite and files the backfill CR. The closest existing mechanism is `shot-before-aim`'s
formation-owned detect-and-file-CR flow for prose-impl drift; whether that same path covers a
placement-driven promotion, or a change to placement itself should carry the obligation, is
undecided. -->

## Inject channel — zoom into a single inner-loop agent

A capability for the human **Council** to zoom from the orchestration level down into a
single inner-loop agent — to communicate with it or fine-tune it directly. It defines two
distinct moves toward an agent, both entered through the `gateway`:

| Move | Nature | Effect |
|---|---|---|
| **Project** | asynchronous, persistent | imprint a **program** (a governance — the agent's operating directives) and withdraw; the tuning persists on every future autonomous run |
| **Inject** | live, transient | jack into one inner-loop agent in real time to converse or pilot *through* it; the channel closes when the Council withdraws |

Projecting is *calibrating the worker*; injecting is *being present in it*. They must never
be conflated — one changes future behavior, the other operates the present.

The mechanism is **dual-mode**: an injectable agent can be (a) dispatched autonomously as
a subagent **and** (b) loaded in-context as a persona — for a live human channel. The
injectable set is the **inner-loop producers and judges**. This is the same persona surface
the **conductor** uses by default for the `spec-producer` / `solution-producer` (the live
grill runs in-session, `../design/specialists-and-squads.md`): injecting is the Council
stepping into a worker the model already knows how to run in-context.

Two invariants:

- **The gateway is the single door.** An inject attempted outside the gateway is refused;
  the only accepted entry to both project and inject is the gateway.
- **Inject respects existing contracts.** A live channel does not bypass ownership and
  governance rules: a judge injected live still cannot write artifacts it does not own
  (e.g. a frozen `.feature`); a producer injected live still answers to its program. Inject
  changes *who you are talking to*, never *what they are allowed to do*.

## Scenarios (colocated)

### Channels — intake

```gherkin
Scenario: a human prompt becomes a CR
  Given a human raises a change through the gateway prompt
  When the request is recorded
  Then an open change request exists carrying its what and why

Scenario: a mission claims its CR so no other mission takes it
  Given an open change request at its source
  When a mission begins work on it
  Then the mission claims the source record as accepted
  And another mission cannot claim the same change request while it is held

Scenario: an outer-loop finding re-enters only as a new CR
  Given a retrospective loop finds something that should change
  When it surfaces the finding
  Then it files a new change request rather than mutating the corpus directly

Scenario: a why may cite a combat-log correction
  Given a requester references a combat-log correction in the why
  When the change request is stored
  Then the why cites the correction without copying the mission record

Scenario: a PR handoff lets the pull request close the source
  Given a mission delivers its change request as a pull request
  When the pull request merges
  Then the source change request is closed by the merge
  And the mission does not separately close it

Scenario: a direct-to-main handoff transitions the source to done
  Given a mission delivers its change request directly to main
  When the work is pushed
  Then the mission transitions the source change request to done

Scenario: a reported follow-up re-enters as a new CR
  Given a mission reports a follow-up task back to the source
  When the follow-up is filed
  Then it becomes a new change request rather than reopening the completed one
```

### Escape hatch

```gherkin
Scenario: a task with no suite-relevant behavior escapes SDD
  Given a task that grilling finds has no behavior to freeze as scenarios
  When SDD handles it
  Then the task proceeds outside the SDD lifecycle
  And no draft spec or change request is created for it

Scenario: an escaped task leaves no SDD record
  Given a task that escapes the SDD lifecycle
  When the task is carried out
  Then SDD writes no combat-log entry for it

Scenario: grilling carves a CR out of a task
  Given a task whose impact analysis reveals suite-relevant behavior
  When SDD grills it
  Then that behavioral work becomes a change request
  And the remainder escapes

Scenario: a trivial behavioral change is a CR that self-clears, not an escape
  Given a change that alters observable behavior but reads low-risk
  When SDD handles it
  Then it is a change request that self-clears the gates
  And it is not escaped

Scenario: ambiguous work defaults to a change request
  Given a task that grilling cannot positively clear of behavior
  When SDD handles it
  Then it is treated as a change request and explored

Scenario: a behavioral change confined to a non-durable surface escapes
  Given a change with suite-relevant behavior whose artifact's durability signal resolves non-durable
  When SDD handles it
  Then the change proceeds outside the SDD lifecycle
  And no change request, draft, or combat-log record is created for it

Scenario: an explicit durability declaration overrides the location default
  Given a request that explicitly declares its durability, contradicting its artifact's location default
  When SDD resolves durability
  Then the explicit declaration decides whether the work escapes
  And the location convention is not consulted

Scenario: a private skill or agent definition resolves non-durable by fixed location
  Given a skill or agent definition targeting a user-global or project-private path
  When SDD resolves its durability
  Then it resolves non-durable by the fixed agent-config location convention

Scenario: a project-declared location resolves a script or tool's durability
  Given a script or tool at a path the project has declared non-durable
  When SDD resolves its durability
  Then it resolves non-durable by the project's own configured convention

Scenario: a project-declared durability.toml entry overrides the agent-config fixed-location default
  Given a skill or agent definition at a path the project's durability.toml declares durable
  When SDD resolves its durability
  Then the project's declaration overrides the fixed agent-config location convention
  And the change proceeds as a change request

Scenario: no resolvable durability signal defaults to durable
  Given a change whose artifact-type has neither an explicit declaration nor a project-declared convention
  When SDD resolves its durability
  Then it resolves durable
  And the change proceeds as a change request
```

### Inject channel

```gherkin
Scenario: project imprints a program and persists it
  Given the Council projects into a named inner-loop agent with a new program
  When the projection completes and the Council withdraws
  Then the agent's program reflects the new directives
  And the next autonomous run of that agent applies the new program

Scenario: inject opens a live channel to one named agent
  Given the Council injects into a named inner-loop agent through the gateway
  When the channel is open
  Then the Council exchanges messages with that agent directly
  And the channel closes when the Council withdraws

Scenario: a withdrawn projection still changes the next run but a withdrawn injection does not
  Given the Council has both projected a program into an agent and injected a live channel into it
  When the Council withdraws from both and the agent runs again autonomously
  Then the agent runs with the projected program applied
  And the agent runs with no live channel to the Council

Scenario: an inject attempted outside the gateway is refused
  Given the Council attempts to open a channel to an agent without going through the gateway
  When the attempt is made
  Then the attempt is refused
  And the only accepted entry to project and inject is the gateway

Scenario: an injected judge cannot write what it does not own
  Given a judge injected live during an approved spec
  When the Council pilots it to edit the frozen feature
  Then the frozen feature is unchanged

Scenario: an injected producer still obeys its program
  Given a producer injected live whose program forbids an action
  When the Council pilots it toward that action
  Then the producer does not perform the forbidden action
```
