# Artifact-type

The **squad key**: how SDD decides which producer/judge/governances/model/effort handle a given
file. Rule side only. The squad itself is `specialists-and-squads.md`; how its bars resolve is
`governance-resolution.md`; this file owns the **key** — what an artifact-type is, where the
vocabulary comes from, and how a file gets one.

## What it is

- **The squad key.** One artifact-type per produced **file** → exactly one squad (one producer, one
  judge, its governances, model, effort). `specialists-and-squads.md` owns the squad; this file owns
  the key that selects it.
- **Universal, not SDD-only.** artifact-type keys squads for **any** project SDD manages — `skill`,
  `subagent`, `command`, `agents-section`, `docs`, `astro-page`, `npm-package`, `react-component`, …
  An open string; new types need no schema bump.
- **Orthogonal to `spec-type`.** `spec-type` (`spec-structure.md`) says *what kind of spec node*
  this is (descriptive / reference / behavioral); artifact-type says *who produces and judges the
  artifact*. A node README carries `spec-type` only — **never** an artifact-type field. A file's
  artifact-type is **resolved, not stored** on the file or the node.

## Supply — plugins declare the vocabulary

The set of artifact-types that resolve to a real squad is **declared by plugins**, never invented
locally:

- A plugin declares the squads it provides (`squads[]`, each over a set of artifact-types) when it
  **publishes/updates its marketplace entry** — the global catalog (`plugin/`, `sub-marketplace`).
- On install, that declaration lands in the per-project registry `.agents/universal-plugin.json`
  `sdd-plugins[]` (the plugin's `init-<plugin>` writes it). **Resolution reads this registry**, not
  the marketplace and not plugin directories.
- **SDD core ships only the generic defaults.** A type no installed plugin claims still resolves —
  to the SDD-default producer/judge for each role (`specialists-and-squads.md`). artifact-type is
  thus always resolvable; an unmatched type is not an error, it is the default squad.

Flow: **marketplace → install → registry → resolution.**

## Demand — how a file gets its artifact-type

Resolution is **per file**, in order:

1. **Convention / context.** The conductor classifies from path conventions and the unit it is
   producing — a `SKILL.md` under `skills/` is a `skill`; an agent under `agents/` is a `subagent`.
   Most files are unambiguous and stop here. **Not the file extension** — a `.md` may be a `skill`,
   a `docs` page, or an `agents-section`; *where it lives and what it is* decides.
2. **Tiebreaker map.** Only on **genuine ambiguity or a path the user flags** does the conductor
   consult the optional tiebreaker (below). Most-specific (longest-prefix) glob wins. If still
   unresolved, **ask once — confirm, never guess** — then **write the binding back** so the next
   resolution is deterministic.
3. **Match.** Match the resolved artifact-type against `universal-plugin.json` `sdd-plugins[]` — the
   squad whose `artifact-types` contains it serves the file. Zero plugins → SDD default. Two+
   plugins claim the type → the contested-type disambiguation (`specialists-and-squads.md`).

## The tiebreaker map

A small, optional, agent-maintained lookup table — **only** the ambiguities, never a full path
census:

- **Location:** `.agents/sdd/artifact-types.toml` (the `.agents/sdd/*` runtime-settings home).
- **Shape:** a keyed TOML map `"<path-or-glob>" = "<artifact-type>"`.
- **Mutable, edited in place** — last-write-wins per key; correct a wrong binding by overwriting its
  key. It is a lookup table, **not** an append-only event log (contrast the `ledger.jsonl` /
  `*.log.jsonl` provenance streams in `provenance-model.md`).
- **Optional** — absent is fine; convention covers the common case. The map exists to make a *known*
  ambiguity reproducible, not to enumerate every file.

## Naming

`artifact-type` is the one term. The earlier `domain` / `domains[]` / `domain-type` /
`domain-plugin` vocabulary is retired:

- a plugin's served types → its `squads[].artifact-types` (registry) / `supported-artifacts`
  discovery union (marketplace);
- a file's resolved type → its **artifact-type** (resolved, never a stored `domain-type` field);
- the chosen plugin for a contested artifact-type → the contested-type disambiguation
  (`specialists-and-squads.md`), not a `domain-plugin` map.
