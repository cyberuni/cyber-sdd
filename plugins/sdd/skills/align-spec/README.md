# align-spec

SDD skill — detect and reconcile prose↔suite drift across the project spec's nodes. It runs the
same alignment check the spec gate runs inline at every CR, but **on demand** across the whole
spec (or a chosen node set) — for audits, post-large-change verification, and CI gating. It is the
only project-spec tool that **reconciles** rather than only reporting.

```bash
node scripts/align-spec.mts --spec-dir <spec>                    # audit (TOON drift report)
node scripts/align-spec.mts --spec-dir <spec> --check            # CI guard (fails on drift)
node scripts/align-spec.mts --spec-dir <spec> --nodes a,b --base HEAD~1
```

Detect splits into a mechanical **scenario-diff** (this engine, reusing `spec-gate`'s
`classify-edit-class` against the frozen baseline — a narrowing flags a Clearance) and a
judge-orchestrated **coverage/contradiction** check (the resolved spec-judge's Builder-coverage
lens; no engine code, since there are no scenario IDs in prose to bind against). Reconcile applies
the judge's verdict through two write primitives, `trimProse` and `appendScenario`, that
structurally cannot touch `status`/`approval`/freeze — see [`SKILL.md`](./SKILL.md) for the full
procedure and the frozen-scenario map. **User-invocable.**
