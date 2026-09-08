---
name: sdd2
description: "Use this skill when the user explicitly invokes SDD 2 or cyber-sdd-2 — the second-generation Spec-Driven Development process. Routes a request to the sdd2 engine and reports what the scaffold can currently do."
---

# SDD 2

The gateway for the second-generation SDD process. It is the single entry point
into `cyber-sdd-2`; every other capability will hang off it as the process is
built out.

## When this applies

The user names SDD 2, `sdd2`, or `cyber-sdd-2` directly. Requests for the
shipped first-generation process belong to the `sdd` gateway instead — the two
plugins coexist deliberately, and this one never handles work addressed to the
other.

## What to do

1. Confirm the CLI is reachable:

   ```bash
   cyber-sdd-2 --version
   ```

   Inside this repository, run it from source instead:

   ```bash
   pnpm --filter cyber-sdd-2 dev -- --version
   ```

2. Tell the user what the scaffold covers today: the plugin loads, the CLI
   answers `--version` and `--help`, and no process commands exist yet.

3. Do not improvise the missing process. If the user asks for mission, gate, or
   spec work that SDD 2 does not implement yet, say so and point at the
   first-generation `sdd` gateway.
