# Trial A — colocate the node spec, drop the `.feature`

The transformation, performed on `place-node` on a scratch branch off `0e35688` and reverted
afterwards. Measurements in [`../evidence.md`](../evidence.md) (E2).

`colocate-place-node.patch` is the diff:

```
git mv .agents/specs/sdd/project-spec/place-node/README.md plugins/sdd/skills/place-node/spec.md
git rm .agents/specs/sdd/project-spec/place-node/place-node.feature
```

The patch reports **0 changed lines** for the relocation — `git diff -M` sees a pure rename.
That is the finding, not an artifact of how the patch was taken: per `lifecycle-governance`, a
zero-content-delta rename preserves `@frozen` and is not a gate-able edit. Colocation is free
on the freeze axis.

The `.feature` removal is the other half of A: under A2 the suite is
`plugins/sdd/skills/place-node/scripts/place-node.test.mts`, which was already colocated with
the implementation before the trial began. That file is unchanged and still green (6/6) — which
is why it is a fair test of A2 rather than a strawman, and why its **5-of-7** coverage of the
frozen scenarios is the measurement that decided against A2.

## Reproducing

```bash
git checkout -b trial/a-colocate-place-node 0e35688
git apply --index .research/next-spec-architecture/trial-a/colocate-place-node.patch
cd plugins/sdd && node skills/check-project-specs/scripts/check-project-specs.mts
```

Run it against `0e35688` first for the baseline. Do **not** measure with root `pnpm verify` — it
returns exit 0 over this patch (E5).
