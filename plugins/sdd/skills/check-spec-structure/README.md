# check-spec-structure

Internal SDD skill — the concrete engine for **spec-structure checking**. Audits one project spec's
internal node-shape and emits a finding set for the formation Warden: the intra-spec successor to the
retired cross-spec `dedupe-specs`/`split-spec` tools, now that one project is one spec.

```bash
node scripts/check-spec-structure.mts --spec-dir <spec>          # audit (TOON finding set)
node scripts/check-spec-structure.mts --spec-dir <spec> --check  # CI guard (fails on blocking)
```

Two deterministic checks — **untagged-node** (blocking: a spec-typed node with no `concept:`) and
**oversized-node** (advisory: `.feature` over the granularity threshold) — plus an intra-spec
contradiction arm judged by the Warden. Read-only, frontmatter + scenario-count only; writes
nothing. See [`SKILL.md`](./SKILL.md) for the full contract. Not user-invocable.
