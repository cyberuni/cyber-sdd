---
spec-type: behavioral
---

# discovery — find specs at the SDD spec locations by status shape

The **discovery** procedure: locate the project specs in a repo at the **three SDD spec
locations**, confirmed by their **status shape**. A spec is a git-tracked `spec.md` that sits at one
of the three locations **and** carries a frontmatter `status` in the lifecycle enum. Consumers scan
the three locations, filter to candidates carrying a lifecycle `status`, and match a requested name
to a spec's **folder slug** (its root-relative path). The locations are **fixed conventions**, not a
hardcoded registry: no array or index of paths is ever consulted — discovery is a **pure
derivation**, so no second place can drift. The concrete engine is the
[`discover-specs`](../../../plugins/sdd-new/skills/discover-specs/) skill, which
parses each spec's frontmatter only and emits the list as TOON.

## Use Cases

**Subject** — deriving the set of project specs in a repo, and resolving a name to one of them.
**Non-goals** — it reads no runtime behavior, owns no lifecycle state, never reads spec bodies
(frontmatter only), and never writes. It locates specs; it does not summarize them (that is
`digest`) or compare them (that is `dedupe-specs`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **list the specs** — a tool needs the corpus set | a repo root | every git-tracked spec at a spec location carrying a lifecycle `status`, keyed by folder slug, with its frontmatter, as TOON |
| **resolve a name** — a request names one spec | the discovered list + a name | the spec whose folder slug matches; an ambiguous match is disambiguated with the user, never guessed |

Every scenario in [`discovery.feature`](./discovery.feature) maps to one of these two entry points.

## How a spec is recognized

Recognition is **location-bounded and shape-confirmed** — both must hold:

- **Location** — the `spec.md` sits at one of the three SDD spec locations:
  1. `.agents/spec/spec.md` — repo-root single-project
  2. `.agents/specs/<project>/spec.md` — repo-root multi-project
  3. `<project-path>/.agents/spec/spec.md` — a nested project (the `**` is the project-path, any depth)
- **Shape** — its frontmatter `status` is in the lifecycle enum. A `spec.md` at a spec location with
  no lifecycle `status` is **not** a spec (so the scan never grabs a stray file by accident); and a
  status-bearing `spec.md` **outside** the three locations is not discovered either.

The name match is against the **folder slug** (root-relative path). The lifecycle-`status`
convention and the spec-location set are owned by [`../../design/`](../../design/) (ADR-0017);
discovery's consumers defer to them rather than restate them.

## Delivery

This unit is implemented by the **`discover-specs`** skill —
`plugins/sdd-new/skills/discover-specs/` — a non-user-invocable skill carrying a
self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention; an agent fallback when
`node` is absent). The script realizes the **list-the-specs** entry point (scan the three locations,
filter by status shape, parse frontmatter only, emit TOON); **resolve-a-name** is the caller's step
over that list. The node and its engine carry different names (capability vs mechanism) — this
`## Delivery` link is the spec→impl pointer, as `../../gateway/` names the `sdd` skill.

## Source

- new — no prior `plugins/sdd/` impl. First implemented under `plugins/sdd-new/` in the
  `discover-specs` CR, which also narrowed spec recognition from "any `spec.md` with a
  status, anywhere" to the three location-bounded patterns (ADR-0017).
