---
name: check-plugin-manifests
description: "Partial Skill: invoke by name only — plugin/check-plugin-manifests' guard engine against a manifest declaring a component the package does not ship — the CI guard, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Plugin Manifests

The concrete engine for the rule that **a plugin manifest declares only components the package
ships**. A pointer naming something the package does not carry is valid JSON, satisfies the schema,
and is copied into every generated vendor manifest — it fails only on an installer's machine, after
publish, as a component the host runtime cannot load. Nothing else in the repo compares a manifest's
pointers against what ships.

Spec: [`.agents/specs/sdd/plugin/check-plugin-manifests/`](../../../../.agents/specs/sdd/plugin/check-plugin-manifests/README.md).

## What it checks

Two sub-checks, neither subsuming the other:

- **the disk check** — does the pointer resolve to a path that exists?
- **the publish check** — for a package that publishes, is the pointer inside its `files` allowlist?

A directory can exist and be excluded from the tarball; a `files` entry can name a directory nobody
created. The disk check **short-circuits**: a pointer dead on disk is reported once, as unresolved,
and is not also asked about `files`.

**A pointer is any `./`-prefixed string value**, at any depth, under any key — not a fixed key list.
The manifest format grows new component keys, and a guard hardcoding today's set fails open on the
next one added.

**A pointer resolves against the plugin root, not the manifest's own directory.** A vendor manifest
sits one level down; a guard resolving relative to the file it just read reports every vendor
manifest as entirely broken.

**A package that declares no `files` at all ships everything**, so there is no allowlist to be
outside of. Reading an absent allowlist as an empty one inverts npm's semantic and manufactures a
finding against every pointer in the package.

## Run it

```bash
node "<skill>/scripts/check-plugin-manifests.mts" [--root <dir>]
```

`--root` defaults to the working directory. A finding always exits non-zero — there is deliberately
no report-only mode, because a chain that forgets the strict flag reports green over a defect, and
green is what the repo treats as clearance to commit. An unrecognized flag is an error, never an
input to ignore.

It joins the root check chain as **`check:plugins`**, so it runs on every `pnpm verify` and in CI.
