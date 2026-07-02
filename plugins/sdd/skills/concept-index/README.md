# concept-index

Internal SDD skill — the concrete engine for the **concept-index** step. Scans one project-spec for
every node's `concept:` frontmatter and renders the **by-concept view** into the root `spec.md`,
re-unifying a cross-cutting concern the capability folder tree scatters.

```bash
node scripts/concept-index.mts --spec-dir <spec> --write   # refresh the block
node scripts/concept-index.mts --spec-dir <spec> --check   # no-drift guard
```

Pure derivation, frontmatter only; the write touches only the delimited generated block. See
[`SKILL.md`](./SKILL.md) for the full contract. Not user-invocable.
