# authoring/ — the shared authoring capability

The **shared authoring capability**: take a CR and **grill it into a concrete delta to the
project spec + behavior suite**. The CR is the abstraction the human raised; authoring is where
it becomes real changes to the `spec.md` prose and the `.feature` suite (and from there, code,
in `../mission/`).

`.feature` is **part of the behavior suite, never part of the CR** — authoring *writes* the
suite delta, it does not receive it.

> **This README is a `descriptive` capability overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type` marker,
> no `.feature`, and no `## Use Cases`; each behavior lives in a **behavioral** spec (a unit spec)
> below, where the use cases map to that unit's suite. (Only a behavioral node carries
> `## Use Cases`; a descriptive index carries none — the same rule the gate digest applies when it
> reports a touched area with no `.feature` as zero scenarios, not an error.)

## Role in the system

**One capability, two drive modes.** Authoring is the mission's **explore** phase (step 2 of the
Mission Loop — `../mission/`, `../design/loops.md`), always run by the **conductor**: in-session via
the user-facing **`start-mission`** skill (the human grills live), or headless via the **`automaton`**
(autonomous). There is **no separate create/revise entry skill** — scaffolding a new node and
re-opening a draft are modes of explore, folded into `start-mission`. Either way it **self-clears**
when the agent can confidently generate a good diff, escalating to the human only on the hard floor
(`../design/autonomy-rubric.md`).

**Producer/judge separation (capability-wide).** The **producer** authors the diff (spec prose
plus scenarios); a **distinct judge** actor verifies it. Authoring never collapses producing and
judging into one voice; the producer self-aligns against the same governances the judge checks
against. This split holds across every unit below.

## Units

This capability hosts several **units of code** (skills). The unit of test is the skill — **one
`.feature` per unit**, named for the unit and colocated with the unit's spec in its own folder.
A producer suite never tests gate behavior and a gate suite never tests grilling — mixing two
units in one file is a category error. The freeze grain is **per `.feature` file**, so units
freeze independently. Cross-capability outcome (e2e) scenarios live in `../workflows/`, never
here.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **spec-producer** | behavioral | [`spec-producer/`](./spec-producer/README.md) | the `spec-producer-governance` procedure — grill a CR into spec prose + a boolean suite (create / revise / backfill modes); **producer behaviors only** |
| **scaffold-project-spec** | behavioral | [`scaffold-project-spec/`](./scaffold-project-spec/README.md) | the project-level layout bootstrap — choose an organization strategy + spec location, scaffold the skeleton, and declare `project-path` + the body placement map, when a project has no project spec; an **internal step the conductor loads** during explore |
| **spec-gate** | behavioral | [`spec-gate/`](./spec-gate/README.md) | the spec gate — the verdict, the three verbs, per-file freeze, the digest, and the structural provenance checks |
| **spec-format** | reference | [`spec-format/`](./spec-format/README.md) | the `spec-format-governance` bar — the required `## Use Cases` section + `spec.md` enrichment; a **reference artifact** (no `.feature`), loaded by the producer/judge |
| **suite-format** | reference | [`suite-format/`](./suite-format/README.md) | the `suite-format-governance` bar — the `.feature` form (boolean Gherkin, `@rubric`, ordering, the `@frozen` marker); a **reference artifact**, loaded by the producer/judge |

The user-facing entry that *runs* this capability is **`start-mission`** (the conductor's explore
phase); scaffolding a new node and re-opening a draft are modes of explore, not separate skills.

## Where the rules live

Gate and authoring *rules* live in `../design/`: legal-state transitions and the freeze model in
`lifecycle-model.md`, the self-clear-vs-escalate bar and the four-C hard floor in
`autonomy-rubric.md`, the provenance shape in `provenance-model.md`. The `spec.md` structure and
`.feature` form bars are the [`spec-format/`](./spec-format/README.md) and
[`suite-format/`](./suite-format/README.md) reference nodes here. The behavioral unit specs are the
*behavior* that enacts those rules — they reference the rules, they do not restate them.
