---
title: init-quill
description: Register Quill as the SDD documentation plugin for a project.
---

Part of the [Quill plugin](/quill/overview/) — see that page for install instructions.

**Trigger:** "set up Quill for this project", "register Quill as the SDD plugin"

Registers Quill in the project's SDD plugin registry so the [SDD](/sdd/overview/) conductor resolves Quill's production-chain roles by reading only `.agents/universal-plugin.json` — no plugin-directory scanning at runtime.

## What it does

1. Locates (or creates) `.agents/universal-plugin.json` at the project root.
2. Reads Quill's own version from its plugin manifest.
3. Writes (or rewrites, on upgrade or legacy shape) the `quill` entry under `sdd-plugins` with a single squad serving artifact-types `documentation`, `guide`, `tutorial`, `article`, `reference`:
   - `spec-producer: quill-spec-writer`, `impl-producer: quill-doc-writer`, `impl-judge: quill-judge`
   - `spec-judge: null` — degenerates to static doc criteria the spec gate runs itself, no judge agent
   - `solution-producer: null` — uses the SDD default
   - All governance slots stay `null` — Quill relies on SDD's default actor-gate bars

## Key behavior

- **Fails closed on a corrupt registry file** — if `.agents/universal-plugin.json` exists but is malformed JSON, it stops with an error rather than overwriting it.
- Rewrites (not appends) an existing `quill` entry found in a legacy shape or with a stale version, without disturbing other plugins' entries.
- Requires every squad to carry a `governances` block (bindings may be `null`, but the block itself must be present) — rejects a payload missing it.

## Next step

Run [`sdd:start-mission`](/sdd/overview/) to scaffold a documentation spec; the conductor resolves the Quill roles automatically.
