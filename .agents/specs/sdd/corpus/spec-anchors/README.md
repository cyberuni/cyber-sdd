---
spec-type: behavioral
concept: spec-structure
---

# spec-anchors — declare and curate the extra spec anchors discovery scans

The **spec-anchors** config is the opt-in, declared override that widens
[`../discovery/`](../discovery/README.md) beyond the three fixed SDD spec locations: a project whose
specs live off-convention lists extra location patterns in `.agents/sdd/spec-anchors.toml`, and
discovery scans them **in addition to** (never instead of) the fixed conventions. Because the config
is a **declared second source that can drift** — the very registry ADR-0017 kept out of the derived
hot path — it is **opt-in** and **curated through a manage skill** rather than hand-edited: the skill
lists the anchors, performs CRUD on the custom ones, **induces** a pattern from a sample path, and
**previews** which project(s) a pattern would match before it is saved. See ADR-0019.

## Use Cases

**Subject** — the spec-anchors config format, and the curation operations over it (list, CRUD,
induce, preview).
**Non-goals** — it does **not** scan or list specs itself (that is `../discovery/`, which *reads*
this config); it writes **only** the config file, never a `spec.md`, `status`, `approval`, or a
freeze; it opens no CR and invokes no gate (it is a manage-level engine, `../../gateway/manage/`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **list the anchors** — see what discovery scans | the repo | the three **fixed** anchors, each with a one-line explanation of what it matches, plus every **custom** anchor from the config, flagged fixed-vs-custom |
| **add / edit / remove a custom anchor** — curate the config | an anchor pattern (+ the op) | the `.agents/sdd/spec-anchors.toml` is created/updated with the change; the fixed conventions are never writable |
| **induce a pattern from a path** — the user has a sample spec dir, not a pattern | a repo-relative sample path | one or more candidate anchor patterns (a literal dir, and a `<project>`-token generalization) for the user to pick |
| **preview an anchor's effect** — will this match what I expect | a candidate pattern | the project(s)/spec(s) that pattern would discover, computed **without** persisting the pattern |

Every scenario in [`spec-anchors.feature`](./spec-anchors.feature) maps to one of these four entry points.

## The config format

`.agents/sdd/spec-anchors.toml` carries one key:

```toml
# Extra spec anchors, scanned IN ADDITION TO the three fixed conventions.
anchors = [
  "source",                          # → source/spec.md            (name: basename → guessed)
  "curriculum/sessions/*/*/<project>",  # → …/<session-id>/spec.md (name: captured <project> → derived)
]
```

- Each entry is a **repo-relative pattern naming the directory** that holds a `spec.md` (the engine
  probes `<pattern>/spec.md`, mirroring the fixed conventions).
- A `*` segment is a single-segment glob; a `<project>` token both globs a segment **and captures**
  it as the spec's name (name-source `derived`). An entry with no `<project>` token names its spec by
  folder basename (`guessed`), and a frontmatter `name` always wins (`declared`).
- The fixed conventions are **implicit and always scanned** — they are never listed in this file.

## Fixed vs custom — what `list` shows

`list` always shows the three fixed anchors with their purpose, then any custom anchors:

| Anchor | Kind | Matches |
|---|---|---|
| `.agents/spec/` | fixed | the repo-root single-project spec |
| `.agents/specs/<project>/` | fixed | each repo-root multi-project spec (folder names the project) |
| `<project-path>/.agents/spec/` | fixed | a nested project's hoisted spec, at any depth |
| *(each config entry)* | custom | whatever the declared pattern matches |

## Resilience — a bad config never breaks discovery

Curation validates a pattern **before** it is written, so a malformed entry is not persisted through
the skill. Discovery itself is **fail-safe**: an unreadable or malformed `spec-anchors.toml` is
ignored with a warning and discovery falls back to the three fixed conventions, so the gateway's
status scan never crashes on a hand-corrupted config.

## Delivery

Implemented by the **`manage-spec-anchors`** skill —
`plugins/sdd-new/skills/manage-spec-anchors/` — a non-user-invocable skill (loaded in-session by
`manage`, `../../gateway/manage/`) carrying a self-contained `.mts` script (the repo's node-≥23.6 /
no-deps convention). The script realizes `--list`, `--add` / `--remove` / `--edit`, `--induce <path>`,
and `--preview <pattern>`; the config it reads/writes is the same `.agents/sdd/spec-anchors.toml` the
`discover-specs` engine consumes. The **preview** reuses the discovery scan restricted to the
candidate pattern.

## Source

- new (GitHub #39, ADR-0019) — no prior impl. Introduced with the discovery extra-anchor override to
  give projects a curated way to declare off-convention spec locations without hand-editing config.
