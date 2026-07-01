---
spec-type: behavioral
concept: corpus-structure
---

# discovery — find specs at the SDD spec locations, named and resolvable

The **discovery** procedure: locate the project specs in a repo at the **three SDD spec
locations**, confirmed by their **status shape**, each carrying a **project name** so a consumer can
resolve a name → spec. A spec is a git-tracked `spec.md` that sits at one of the three locations
**and** carries a frontmatter `status` in the lifecycle enum. The locations are **fixed
conventions**, not a hardcoded registry: no array or index of paths is ever consulted — discovery is
a **pure derivation**, so no second place can drift. The concrete engine is the
[`discover-specs`](../../../plugins/sdd-new/skills/discover-specs/) skill, which parses each spec's
frontmatter only and emits the list as TOON.

## Use Cases

**Subject** — deriving the set of named project specs in a repo, and resolving a name to one of them.
**Non-goals** — it reads no runtime behavior, owns no lifecycle state, never reads spec bodies
(frontmatter only), and never writes. It locates specs; it does not summarize them (that is
`digest`) or audit their node-shape (that is `../../project-spec/check-spec-structure/`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **list the specs** — a tool needs the corpus set | a repo root | every git-tracked spec at a spec location carrying a lifecycle `status`, keyed by folder slug, with its **name + name-source**, status, project-path, and gate approvals, as TOON |
| **resolve a name** — a request names one spec | the discovered list + a name | the spec whose **name** matches; an exact single match resolves deterministically, an ambiguous name returns the **candidate set** for the agent to disambiguate **with the user** (the agentic half), never silently picked |

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

The lifecycle-`status` convention and the spec-location set are owned by
[`../../design/`](../../design/) (ADR-0017); discovery's consumers defer to them rather than restate
them.

## Project name and its source

A consumer resolves a name → spec, so each entry carries a **name** and a **`name-source`** that
flags how trustworthy it is — because a project's name is not always derivable from its location:

- **`declared`** — the frontmatter `name` field (authoritative; set at spec creation, see
  `../../authoring/backfill-project-spec/`). Required in practice for a **nested** project, whose
  folder may not be the name the user uses (a `package.json` name, an acronym, …).
- **`derived`** — reliably inferred: the repo-root single-project (`.agents/spec`) takes the
  assumable name `repo`; a `.agents/specs/<project>` folder names itself.
- **`guessed`** — a nested project with no declared name falls back to its folder **basename** (e.g.
  `pkg-a` from `packages/pkg-a/.agents/spec`); a consumer should **confirm** a guessed name with the
  user before relying on it.

## The deterministic / agentic split

Most of discovery is **deterministic** and node:test-verified — listing, the status filter, name
derivation, the TOON output (which carries no body content), and the **exact-match / candidate-set**
half of name resolution. Two scenarios are **agentic** (`@rubric`, judged by hand or by ACES when
wired) because they assert **agent** behavior, not script output: *disambiguating an ambiguous name
with the user*, and *an agent never learning a spec body* (the token-cost reason "frontmatter only"
exists — the script reads the whole file but its output, hence the agent's context, excludes bodies).

## Delivery

This unit is implemented by the **`discover-specs`** skill —
`plugins/sdd-new/skills/discover-specs/` — a non-user-invocable skill carrying a
self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention; an agent fallback when
`node` is absent). The script realizes **list-the-specs** (scan, status filter, name derivation,
frontmatter-only TOON) and the **deterministic half of resolve-a-name** (`--resolve <name>` →
exact-match spec, or the candidate set when ambiguous); the **agentic half** (disambiguating with
the user, never learning a body) is the `@rubric` scenarios, judged by hand or by ACES once it is
the agent-config impl-judge. The node and its engine carry different names (capability vs mechanism)
— this `## Delivery` link is the spec→impl pointer, as `../../gateway/` names the `sdd` skill.

## Source

- new — no prior `plugins/sdd/` impl. First implemented under `plugins/sdd-new/` in the
  `discover-specs` CR, which also narrowed spec recognition from "any `spec.md` with a
  status, anywhere" to the three location-bounded patterns (ADR-0017).
