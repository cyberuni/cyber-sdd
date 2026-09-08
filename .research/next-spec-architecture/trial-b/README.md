# Trial B — externalize the corpus into a queryable store

Two artifacts, both `node:sqlite` and no dependencies, matching the repo's self-contained
`.mts` convention. Neither is shipped; neither touches the corpus. Measurements in
[`../evidence.md`](../evidence.md) (E3).

## `spec-store-next.mts`

Ingests all 232 corpus files into SQLite with an FTS5 index, and answers questions against it.

```bash
node spec-store-next.mts ingest --root <repo> --db spec.db   # {"files":232,"bytes":1947815}
node spec-store-next.mts stats  --db spec.db
node spec-store-next.mts ask    --db spec.db "what freezes a feature file at the spec gate"
```

This is deliberately the **best case** for a second brain: deterministic full-text retrieval
with no model in the loop, so nothing can hallucinate. Whatever it fails at, a model-backed
version fails at at least as badly.

Result: the store holding 1,947,815 bytes of corpus occupies **5,218,304 bytes** — 2.7×, as an
opaque binary.

## `oracle-benchmark.mts`

Ten questions a real mission asks, each with a hand-established answer path, scored against
`grep` as the alternative access path.

```bash
node oracle-benchmark.mts --root <repo> --db spec.db
```

Result: **6/10** top-5 recall against `grep`'s **9/10** over the same corpus — roughly 8/10 if
the more arguable answer labels are re-scored generously, still below `grep`. Losing to `grep`
is not the finding either. The finding is that **the four misses look exactly like the six
hits** — same shape, same apparent confidence, no signal separating them.
An externalized corpus answers every question equally fluently, including the ones it is wrong
about.
