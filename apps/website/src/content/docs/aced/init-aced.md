---
title: init-aced
description: Register ACED as the SDD plugin for agent-configuration domains.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** "set up ACED for this project", "register ACED as the SDD plugin"

Registers ACED in the project's SDD plugin registry so the [SDD](/sdd/overview/) conductor resolves the ACED production-chain roles by reading only `.agents/universal-plugin.json` — no plugin-directory scanning at runtime.

## What it does

1. Locates (or creates) `.agents/universal-plugin.json` at the project root.
2. Reads ACED's own version from its plugin manifest.
3. Writes (or rewrites, on upgrade or legacy shape) the `aced` entry under `sdd-plugins` with a single squad serving artifact-types `skill`, `subagent`, `command`, `agents-section`:
   - `spec-producer: aced-scenario-writer`, `spec-judge: aced-spec-validator`, `impl-judge: aced-impl-judge`
   - `impl-producer: null` — writing the agent config itself is done by [`define-agent`](/aced/define-agent/) / [`improve`](/aced/improve/) or the SDD-default impl-producer, not a bound agent
   - `solution-producer: null` — uses the SDD default
   - Binds its own `builder-spec` / `builder-impl` bars; other governance slots stay `null` (SDD default)

## Key behavior

- **Fails closed on a corrupt registry file** — if `.agents/universal-plugin.json` exists but is malformed JSON, it stops with an error rather than overwriting it.
- Rewrites (not appends) an existing `aced` entry found in a legacy shape or with a stale version, without disturbing other plugins' entries.
- Requires every squad to carry a `governances` block (bindings may be `null`, but the block itself must be present) — rejects a payload missing it.

## Next step

Run [`sdd:start-mission`](/sdd/overview/) to scaffold an agent-configuration spec; the conductor resolves the ACED roles automatically.
