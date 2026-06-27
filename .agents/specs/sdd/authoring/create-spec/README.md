---
spec-type: behavioral
---

# create-spec — scaffold a new spec node and dispatch the producer

The user-facing **entry skill** for new capability content: locate and **scaffold** a new spec
node under the project tree, then dispatch the explore producer chain (`../../mission/`, the
operator) over it. It owns the **user channel** the producer lacks — the up-front grill and the
iteration loop — and leaves the node at `status: draft`, ready for the spec gate
(`../validate-spec/`). It is the interactive twin of the mission's autonomous explore: a human
drives the same capability through the gateway (`../../gateway/`).

`.feature` is **part of the behavior suite, never part of the CR** — create-spec scaffolds the
suite skeleton; the producer writes the scenarios into it.

## Use Cases

**Subject** — the create-spec entry skill: scaffolding one **new** spec node and dispatching the
producer over it.
**Non-goals** — it does not grill the CR into prose or scenarios (that is `../spec-producer/`); it
renders no gate verdict and freezes nothing (`../validate-spec/`); it writes no control
frontmatter (`status` / `aligned` / `approval` / `produced-by` — those are the root `spec.md`'s,
owned by the operator and the gate, `../../design/provenance-model.md`). An **existing** node is
`../revise-spec/`, not here.

**How it is entered.** create-spec is invoked two ways, and the user names only *what* capability to
spec — create-spec decides the rest by grilling, never guessing:

- **directly by a person** — `/create-spec`, "create a spec for `<X>`", or the gateway
  (`../../gateway/`) routing a new-content request to authoring; interactive.
- **by the mission** — as the interactive face of the **explore** phase (`../../design/loops.md`)
  for content that does not exist yet.

The intent splits into three **invocation modes** — the distinct reasons create-spec runs. Each is
written as a user story with the concrete condition that triggers it:

| # | Use case (user story) | Triggered when | Outcome |
|---|---|---|---|
| **UC1 — spec a new feature** | *As a developer, I want to spec a capability that has no code yet, so that the contract is settled before anyone builds it.* | the named target has **no spec node** and **no implementation** | up-front grill → scaffolded node (type-matched) → producer-authored prose + an initial suite, left at `status: draft` |
| **UC2 — backfill from existing code** | *As a developer, I want to capture a spec for behavior that already exists in code, so that the running system gains a contract to gate against.* | the named target has **no spec node** but an **implementation exists** | grill **skipped**; the producer infers what / why / decisions from source, tests, and history; node left at `status: draft` |
| **UC3 — redirect when it already exists (boundary)** | *As a developer who asked to "create" a spec that turns out to already exist, I want to be redirected, so that I revise rather than clobber it.* | the named target **already has** a spec node | hand off to `../revise-spec/`; **scaffold nothing** |

UC1 and UC2 then run the same procedure — **classify → scaffold → grill → drive the operator →
leave at draft** (the sections below) — under cross-cutting guarantees the suite also pins: an
ambiguous classification is **asked, not guessed**; scaffolding writes **no control frontmatter**;
a `needs-input` wave is **batched** back to the user; the iteration cap is **never** silently
auto-accepted; create-spec **advances no status past draft**.

Every scenario in [`create-spec.feature`](./create-spec.feature) maps to one of these three modes
or to a cross-cutting guarantee. The scaffolding, status, and freeze *rules* live in
`../../design/lifecycle-model.md`; the node-skeleton shape per type is the spec-types taxonomy in
`../../design/unit-and-organization.md` and the section bars in `../spec-format/README.md` +
`../suite-format/README.md`. This unit is the *behavior* that enacts them.

## Classify the node

A new node is one of the three spec types (`../../design/unit-and-organization.md`); create-spec
scaffolds the matching skeleton, **declaring** the type in frontmatter — never leaving it to be
inferred:

- **behavioral** (the common case — a testable unit) → `spec-type: behavioral`, a `## Use Cases`
  section, and an initial `<unit>.feature`.
- **reference** (a shipped non-testable artifact, e.g. a governance) → `spec-type: reference`, a
  `## Subject` section, **no** `.feature`.
- **descriptive** (a capability overview / index) → **no** marker, no subject, no `.feature`.

Also classify `artifact-types` (the squad key the operator matches a plugin against —
`../../design/governance-resolution.md`): an agent-configuration artifact (`skill`, `subagent`,
`command`, `agents-section`) names its type; plain product code omits it (the operator resolves
the SDD defaults). When ambiguous, infer from the implementation path and **confirm with the
user**; it is set once at scaffold and never rewritten by a producer.

## Grill the user (new feature only)

The operator has **no user channel**, so collect intent here **before** the first dispatch. For a
new feature with missing What / Why / interface, ask 3–5 targeted questions: the core problem and
who experiences it; observable behavior from the user's view; the public interface (commands,
signatures, events); known edge cases or explicit non-goals; which reviewers must be heard. For
**backfill** (behavior already in code), skip the grill — the producer reads source, tests, and
history instead.

## Drive the operator (the user loop)

Set an **iteration cap** for the sitting (default **3**; override if the user named one), then
loop: dispatch the operator with the node path, `artifact-types`, and the collected intent; on
`complete` exit; on `needs-input` ask the **batched** questions and re-dispatch with the answers,
counting the iteration; on `blocked` or cap-hit-without-converging **do not auto-accept** —
present the failing scenarios and let the user **accept as-is**, **keep looping** (reset the
count), or **change the spec**. The skill leaves the node at `status: draft`.
