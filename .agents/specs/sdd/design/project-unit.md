# The project is the unit

The **external** boundary: what maps to one spec. (The spec's *internal* structure — node types
and layout — is `spec-structure.md`.)

**One durable spec per project.**
A project is a repo harness, an agent configuration, an npm package, a website, or an individual package inside a monorepo.
The spec is a directory tree, not a single file — but it is **one** spec with **one** behavior suite and **one** gate/freeze baseline.

Size is solved by **organizing into files and folders**, NOT by splitting into smaller sibling specs.
The old spec-fleet — one frozen spec per feature — was the disease: it caused cross-cutting ripple (a change touching three features needed three frozen specs re-opened) and repeated approvals.
A project that grows large grows *more folders*, never *more specs*.

**Projects nest.**
A package inside a monorepo is a **nested project**; the monorepo root is the **outer project**.
SDD names only two config scopes — **user** (`~/.agents/`) and **project** (`<project>/.agents/`) — and avoids "workspace"/"repo-root" (both collide with VS Code / npm / git).
Resolution unions across nested project anchors plus user (`governance-resolution.md`).

## The one-spec invariants (what keep the fleet problem dead)

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.**
  The project has a single lifecycle (see `lifecycle-model.md`).
- **Folders are views, never lifecycle units.**
  No folder ever gets its own `status`, approval, or freeze.
  The fleet problem was lifecycle fragmentation, not folder count — so the cure is forbidding per-folder lifecycle, not forbidding folders.
- **No structural `project` vs `feature` axis.**
  One project is one spec; there is no composition graph and no parent/child spec relationship.
  `artifact-type` names the artifact / squad (see `specialists-and-squads.md`), never a structural position.
  Cross-project execution ordering, when it matters, lives in the source tracker, not in spec frontmatter.

## Packaging — the spec stays out of the distributable

A project may itself be a **distributable plugin**.
Plugin install **copies the whole plugin directory** with no include/exclude mechanism, so the spec **never lives inside a distributable plugin dir** — it would ship to every consumer (inert but bloat, and leaking design internals).
Place the spec at `<repo>/.agents/specs/<project>/` (or `.agents/spec/` for a single-project repo); the plugin dir ships only its shippable artifacts (`skills/`, `agents/`, the manifest).
The plugin's exported governances ship **as skills** in `skills/` (`governance-resolution.md`), never as a non-scanned `governances/` dir.
The registry and the per-CR plans are consumer/runtime-side under `<repo>/.agents/`, never inside a plugin.
