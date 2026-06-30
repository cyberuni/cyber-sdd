---
concept: corpus-structure
model: true
---

# The project is the unit

The **external** boundary: what maps to one spec. (The spec's *internal* structure — node types
and layout — is `spec-structure.md`.)

## One spec per project

A **project** is the unit a spec maps to: a repo harness, an agent configuration, an npm package,
a website, or an individual package inside a monorepo. Each has exactly **one** durable spec — a
directory tree, not a single file, but **one** spec with **one** behavior suite and **one**
gate/freeze baseline.

Growth is absorbed by **organizing into more files and folders**, never by splitting into sibling
specs. Splitting a project into a fleet of per-feature specs fragments its lifecycle: one change
touching three features re-opens three frozen specs and pays three approvals, and every
cross-cutting edit ripples across them. One spec with many folders keeps a single lifecycle over
the whole project.

## Projects nest

A package inside a monorepo is a **nested project**; the monorepo root is the **outer project** —
each carries its own `.agents/` anchor. SDD names only two config scopes — **user** (`~/.agents/`)
and **project** (`<project>/.agents/`) — and deliberately avoids "workspace" and "repo-root" (both
collide with VS Code / npm / git). Governance and config **resolve by unioning** across the nested
project anchors plus user (`governance-resolution.md`).

## The one-spec invariants

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.**
  The project has a single lifecycle (see `lifecycle-model.md`).
- **Folders are views, never lifecycle units.**
  No folder gets its own `status`, approval, or freeze. Folders organize the spec; they never
  fragment its lifecycle — the cure for sprawl is forbidding per-folder lifecycle, not forbidding
  folders.
- **No structural `project` vs `feature` axis.**
  One project is one spec; there is no composition graph and no parent/child spec relationship.
  `artifact-type` names the artifact / squad (see `specialists-and-squads.md`), never a structural
  position. Cross-project execution ordering, when it matters, lives in the source tracker, not in
  spec frontmatter.

## Packaging — the spec stays out of the distributable

A project may itself be a **distributable plugin**.
Plugin install **copies the whole plugin directory** with no include/exclude mechanism, so the spec **never lives inside a distributable plugin dir** — it would ship to every consumer (inert but bloat, and leaking design internals).
**Spec placement follows the hoist.** A **nested project**'s spec is lifted out of its (possibly shippable) package dir to `<repo>/.agents/specs/<package-name>/`, named by the package. The **outer / repo-level project** is never a shippable dir, so its spec needs no hoisting — it lives at its own anchor, **`<repo>/.agents/spec/`** (singular). A single-project repo is the degenerate case: its sole project is the outer one, so its spec is just `.agents/spec/`. (`spec/` = this anchor's own project; `specs/<name>/` = nested projects hoisted up to it.) The plugin dir ships only its shippable artifacts (`skills/`, `agents/`, the manifest).
The plugin's exported governances ship **as skills** in `skills/` (`governance-resolution.md`), never as a non-scanned `governances/` dir.
The registry and the per-CR plans are consumer/runtime-side under `<repo>/.agents/`, never inside a plugin.
