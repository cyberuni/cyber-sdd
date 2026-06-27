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

| Trigger | Inputs | Outcome |
|---|---|---|
| **classify + locate** — a CR for capability content that does not exist yet | the CR + the project tree (`.agents/specs/<project>/`) | the target capability folder + the node's **spec-type** (descriptive / reference / behavioral) and `artifact-types`; ambiguity is asked, never guessed; an **existing** node routes to `../revise-spec/` |
| **scaffold the skeleton** — a type + location are chosen | the chosen `spec-type` + `artifact-types` | a node README matching its type (descriptive index → no marker, no `## Use Cases`; reference → `spec-type: reference` + `## Subject`; behavioral → `spec-type: behavioral` + `## Use Cases` + an empty `<unit>.feature`); control frontmatter is **not** written here |
| **grill + dispatch** — the skeleton exists | new-feature intent, or `backfill` | the up-front grill is collected (new feature) or skipped (backfill); the operator runs explore under an iteration cap; `needs-input` waves are batched to the user; the cap is **never** silently auto-accepted |
| **leave at draft** — explore converges | the producer's diff | the node sits at `status: draft`; create-spec advances no status past draft — the spec gate does that |

Every scenario in [`create-spec.feature`](./create-spec.feature) maps to one of these four use
cases. The scaffolding, status, and freeze *rules* live in `../../design/lifecycle-model.md`; the
node-skeleton shape per type is the spec-types taxonomy in
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
