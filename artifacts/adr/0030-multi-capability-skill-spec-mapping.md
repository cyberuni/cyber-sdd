# ADR-0030: Multi-capability skill → spec/impl/test mapping and bidirectional discoverability

## Status

Accepted

## Context

A single skill (or CLI entry point) often implements more than one capability. Examples in this
repo: `init-aced` registers the ACED role-map **and** ensures the run-output directory is
git-ignored; the `manage` dispatchers classify a request and fan out to several engines; the
`cyberfleet` / `cyber-mux` CLIs are facade entry points that dispatch to many component
capabilities.

Under Screaming Architecture the spec tree organizes by **capability**, not by the artifact that
implements it — so one skill legitimately spans several capability nodes. That creates a **fan-in**:
many suites can point at one implementation file. The clean assumption behind SDD's node model —
*node ↔ suite ↔ impl ↔ test is 1:1* — is stressed, and the concrete risk is **discoverability**:

- Forward: reading a spec node, can an agent confidently find its implementation and its test?
- Backward (backfill): reading an implementation file or a test, can an agent confidently find the
  governing spec node?

A decision is needed now because 304-M3 introduces the first deliberate multi-facet split
(`init-aced` → `registry/` + a new `setup/` node), and the answer determines how the tree is
authored going forward.

## Decision Drivers

- Bidirectional discoverability must stay **confident** — spec→impl, spec→test, and the backward
  directions used during backfill.
- The **consuming agent** (the runtime user of a skill) must not be burdened with the internal
  capability decomposition — it needs the skill's description + body, nothing more.
- A node is **exactly one verification class** — ACED-graded (judge-run prose) or deterministic
  (`node:test`-assertable code) — and the two cannot share a node.
- Rules an authoring agent must follow have to live in **runtime-loaded governance**, not only in an
  ADR (governance-self-sufficiency).

## Considered Options

### Option 1: Point every capability node at the shared implementation file

- **Pros**: no new artifacts; the skill file is the single home.
- **Cons**: the fan-in is real — `subject:` becomes many-to-one, so spec→impl cannot say *which
  part* of a large file implements a node, and impl→spec is ambiguous. Forces an ACED-graded and a
  deterministic behavior into one file with no clean verification story.

### Option 2: Declare the decomposition inside the agent config (frontmatter/body)

- **Pros**: the map travels with the artifact.
- **Cons**: leaks internal organization into a runtime-consumed artifact; the consuming agent neither
  needs nor should see it. Rejected on separation-of-concerns.

### Option 3: Two named patterns, chosen by whether the facade has behavior of its own — map lives spec-side

- **Pros**: keeps every `subject:` 1:1; keeps the map out of the consumed config; reuses machinery
  that already exists (`## Scenario map`, `subject`, colocation).
- **Cons**: authors must pick the right pattern; a thin-orchestrator facet requires extracting a
  code seam.

## Decision

Adopt **Option 3**. When one skill implements multiple capabilities, choose a pattern by whether the
facade has behavior of its own, and keep the decomposition **spec-side**, never in the consumed
config.

**Pattern A — thin orchestrator (separable facets).** The facade has no behavior of its own (pure
glue). Give each facet its **own dedicated implementation seam** so its `subject:` is 1:1. A
*deterministic* facet becomes a code artifact (a script) with a colocated `.test.mts`; the skill
gains one glue step that invokes it. Example: `init-aced` → `ensure-results-ignored.mts` is the
subject of the new `setup/ignore-run-output/` node, while `registry/` keeps the `SKILL.md` prose.

**Pattern B — true facade / dispatcher.** The facade's behavior **is** routing/classification. That
is **one** capability node whose `subject:` is the dispatcher (1:1). Its README carries the
route→capability map (`## Use Cases` + `## Scenario map`, each route **linked to its target
capability node**), and each route is a **frozen scenario**; every fan-out target is its own 1:1
node. Example: `manage`, and the `cyberfleet` / `cyber-mux` CLIs (where the code dispatch table is
the same map on a code substrate).

In both patterns the internal map lives in the node README + `.feature` — the source of truth is the
frozen `.feature`; the README map reconciles to it.

## Rationale

- **Verification class forces the split.** A deterministic behavior specified only as prose would be
  "verified" by grading an agent that follows the prose — an ACED-graded outcome, not a
  deterministic test. Giving the facet a code seam is what *makes* it deterministically testable, and
  simultaneously restores a 1:1 `subject:`. The split is not merely preferred; it is required.
- **Discoverability becomes confident in all four directions** (see below), because every `subject:`
  is 1:1 and tests are colocated.
- **The map is internal organization.** The runtime consumer needs the description + body; the
  capability decomposition is an authoring/backfill concern, so it belongs to the spec, and putting
  it in the config would be a separation-of-concerns violation.
- **Most machinery already exists.** `## Scenario map` is already defined as a one-to-one,
  both-directions branch↔scenario table; `manage` already realizes Pattern B by convention.

### Bidirectional discoverability

| Direction | Mechanism |
|---|---|
| spec → impl | `subject:` names the narrowest **dedicated** artifact (1:1) |
| spec → `.feature` | the `.feature` **colocated** in the spec-node dir |
| spec → test (deterministic node) | via `subject:` → the `.test.mts` **colocated with the subject script** (impl-side), where CI's plugin glob runs it |
| impl → spec (backfill) | reverse-lookup on `subject:` returns exactly one node (unambiguous ∵ 1:1) |
| test → spec (backfill) | the `.test.mts` sits beside its subject script → reverse-lookup on `subject:` → the one node |
| facade → capabilities (Pattern B) | README route map (`## Use Cases` / `## Scenario map`), each route linked to its node |

**Test placement (deterministic nodes).** A deterministic (`node:test`-assertable) node's `.test.mts`
tests the **subject code**, so it lives **next to the subject script** (impl-colocated) — not in the
spec-node dir. This keeps it inside the existing CI test glob (a colocated-in-spec test is otherwise
never run — the "frozen ≠ ever ran" trap) and matches the ordinary test-next-to-code convention. The
`.feature` (the contract) stays in the spec-node dir; the spec→test hop goes through `subject:`. An
ACED-graded node has **no** separate test file — its `.feature` is both contract and verification
(judge-run).

## Consequences

### Positive

- Confident bidirectional navigation, including backfill.
- The consumed config stays clean.
- Deterministic facets gain real, mutation-testable coverage.

### Negative

- Thin-orchestrator facets require extracting a code artifact rather than adding prose.
- Authors must classify the facade (orchestrator vs dispatcher) before placing the node.

### Risks

- The README route map can drift from the frozen routing scenarios. Mitigation: the `.feature` is the
  source of truth; a reconciliation check should enforce no-drift (follow-up).

## Implementation Notes

The runtime enforcement rules are **not yet in SDD governance** and must be added by a **separate SDD
CR** (this ADR governs the general model; 304-M3 conforms to it by construction but does not edit SDD
governance). The three rules to encode:

1. **Subject granularity** (`spec-format-governance` / `spec-producer-governance`) — a separable
   facet gets its own dedicated impl artifact; `subject:` points at it, not a shared prose file.
2. **Facade node shape** (`spec-format-governance`) — a dispatcher is one routing node; its README
   route map links each route to its target capability node; each route is a frozen scenario.
3. **Backfill reverse-nav** (`scaffold-project-spec` / `start-mission` backfill path) — impl/test →
   spec is a reverse-lookup on `subject:`, unambiguous because subjects are 1:1.

Filed as a follow-up SDD CR (discovered from mission `304-m3-eval-artifact-migration`).

## Related Decisions

- [ADR-0028](0028-suite-design-test-levels.md) — test type vs test level; verification class.
- [ADR-0029](0029-backfill-produces-and-rederives-from-the-cfg.md) — backfill re-derives from the CFG.
