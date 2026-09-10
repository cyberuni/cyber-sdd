---
'cyber-sdd': minor
---

A new `check-plugin-manifests` guard: a plugin manifest may declare only components the package
actually ships.

A manifest pointer naming something the package does not carry is valid JSON, satisfies the schema,
and is copied into every generated vendor manifest — so it fails only on an installer's machine,
after publish, as a component the host runtime cannot load. Nothing in the repo compared a
manifest's pointers against what ships.

The guard resolves every `./`-prefixed pointer two ways, because a component can fail to arrive in
two independent ways: against **disk** (does the path exist?) and, for a package that publishes,
against its **`files` allowlist** (will the tarball carry it?). A directory can exist and be
excluded; a `files` entry can name a directory nobody created.

Keyed on the **value shape** rather than a component-key list, so a key the manifest format adds
later is covered without editing the engine. Pointers resolve against the **plugin root**, not the
manifest's own directory, so a generated vendor manifest one level down is read correctly.

It joins the root chain as `check:plugins`, so it runs on every `pnpm verify` and in CI. A finding
always exits non-zero — there is deliberately no report-only mode, because a chain that reports
green over a defect is treated as clearance to commit.
