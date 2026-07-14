---
spec-type: behavioral
concept: spec-structure
---

# check-scenario-overlap — detect one behavior living in two owning nodes

The **check-scenario-overlap** procedure: audit **across the nodes** of one project spec and surface
where the **same behavior lives in more than one node's `.feature`** — the intra-project **spec-level
SSA** partner of the code-side collision ladder. Where [`../check-spec-structure/`](../check-spec-structure/README.md)
audits **node-shape within one node** (untagged, oversized), this audits **scenario-overlap across
nodes** — the cross-node axis its per-node scope leaves uncovered. It is a read-only, advisory detector (the
[`../place-node/`](../place-node/README.md) family): it computes candidates and writes nothing; the
Warden confirms real overlap, assigns the owning node, and dedups (`../../formation/`).

## Why this is the missing rung

The scheduler treats two missions as file-disjoint when they touch different `.feature` files — but
if the **same behavior** is specified in **two** files, a change to that behavior must touch both, so
what looked disjoint is a **hard collision the scenario rung cannot see** (it diffs changed scenarios
per file, never across files). One behavior = **one scenario in one owning node** keeps the scenario
rung honest. Cross-*project* dedup (`dedupe-specs`) was retired when one project became one spec;
cross-*node* overlap **inside** a project has had no detector until now.

## The deterministic candidate signal — a textual fingerprint, never a verdict

Overlap detection is split the same way `check-spec-structure` splits node-shape: a **deterministic
candidate-surface** plus a **Warden `@rubric` judgment**. The engine ships candidates, never the
verdict:

- **exact-duplicate** (blocking) — two nodes whose suites each carry a scenario with an **identical
  normalized step fingerprint** (the ordered Given/When/Then step bodies, whitespace- and
  case-normalized). A copy-pasted behavior in two homes is a near-certain one-behavior-two-nodes
  violation; `--check` fails on it.
- **title-overlap** (advisory) — two nodes carrying a scenario with the **same normalized title** but
  **differing** step fingerprints. A weaker signal (same words may name different behavior), so
  advisory — it never fails `--check`; the Warden judges whether it is real overlap.

A fingerprint is computed **per scenario from its steps only** — the title, tags, comments, and
`.feature` prose never reach it, so the signal is behavior-shaped, not cosmetic. Detection is
**cross-node only**: a scenario duplicated **within a single node** raises no candidate (that is the
node's own shape, not a partition failure), and a scenario that appears **once** corpus-wide raises
nothing.

## Use Cases

**Subject** — auditing one project spec **across** its nodes for the same behavior specified in more
than one node's `.feature`, and emitting an overlap-candidate set (with severity) for the Warden.
**Non-goals** — it never audits **node-shape** within a node (untagged/oversized — that is
`../check-spec-structure/`), never flags **within-node** duplicate scenarios, never reads a scenario's
**title or prose** into the fingerprint (steps only), never renders the by-concept view
(`../concept-index/`), and never writes, relocates, or dedups itself — it surfaces candidates; the
Warden decides (`../../formation/`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **audit scenario-overlap** (default) — a formation pass needs the cross-node overlap set | the project-spec directory | an overlap-candidate set: each **exact-duplicate** (blocking) and **title-overlap** (advisory) naming **both** owning nodes and the overlapping scenario; read-only |
| **check drift** (CI) — a no-regression partition guard | the project-spec directory, check mode | exits **non-zero** iff an **exact-duplicate** candidate exists, and **writes nothing**; title-overlap advisories still exit zero |
| **two nodes carrying the same behavior** | two nodes whose suites share a step fingerprint | an **exact-duplicate** candidate naming both nodes and the scenario (blocking) |
| **two nodes carrying a same-named but different scenario** | two nodes sharing a normalized title, differing steps | a **title-overlap** candidate naming both nodes and the scenario (advisory) |
| **confirm real overlap and assign the owning node** (judgment) | an overlap candidate + both nodes' scenarios | escalated for the **Warden**'s `@rubric` judgment — is it the same behavior, and which node owns it; the engine emits no owner |

Every scenario in [`scenario-overlap.feature`](./scenario-overlap.feature) maps to one of these entry
points, to the severity/check-mode rules, or to the determinism/boundary rules that close this spec.

## Severity — blocking vs advisory

- **exact-duplicate is blocking.** An identical step fingerprint in two nodes is a genuine
  one-behavior-two-homes violation; `--check` exits non-zero so CI holds the partition invariant.
- **title-overlap is advisory.** Same title, different steps is a heuristic hint that may be a
  coincidence; it never fails `--check`, and the Warden judges whether it is real overlap.

## The read-only boundary

`check-scenario-overlap` **writes nothing** — no dedup, no relocation, no frontmatter, no `status`.
It emits the candidate set and stops; the Warden confirms overlap, names the owning node, and the
dedup re-enters through the formation loop's verdict discipline (`../../formation/`). A corpus with no
cross-node overlap is a normal input (empty candidate set), never an error.
