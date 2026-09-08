# Changes

What this dossier changed, and what it deliberately did not.

## Landed

- **[ADR-0034](../../docs/adr/0034-colocate-the-node-spec-keep-the-frozen-suite.md)** — records
  the decision: adopt Direction A's placement claim, reject its suite and summary claims, reject
  Direction B.
- This dossier, cited by that ADR as its evidence.

## Not landed, deliberately

Issue #4 is a next-version direction and the brief is explicit: migrate nothing in place.

- **No node was moved.** Trial A was performed on a scratch branch and reverted; the corpus is
  at `0e35688`. `trial-a/colocate-place-node.patch` is the transformation as a patch, kept as
  evidence rather than applied.
- **No governance was edited.** `spec-format-governance`, `suite-format-governance` and the
  pre-flight are being changed by issue #3 in parallel. Nothing here touches them.
- **Nothing was built in `cyber-truss`.** Per E4, truss claims neither direction and is scaffold
  stage. The ADR says so rather than opening work there.

## Work this points at, not started here

Each is a separate unit of work, none of them a migration:

1. **A link-rewriting move** for node relocation. Trial A broke 8 relative references for a
   single node; `check-spec-references` caught all 8, so the fix is mechanical.
2. **A packaging exclusion.** `plugins/sdd/package.json` ships `"files": ["skills", …]`.
   Colocating node specs there would add 900 KB to a 583 KB tarball. Settle this before any node
   moves, not after.
3. **Wire the spec-gate floor into the commit path.** `check-spec-state` and `check-suite` are
   reachable only through the plugin-level entrypoint, not through `pnpm verify` — filed
   independently as **issue #5** and not worked here. ADR-0034 depends on it: a decision to keep
   the frozen `.feature` as the gate-bound artifact is only as good as the check that holds it.

## Related

- Issue [#4](https://github.com/cyberuni/cyber-sdd/issues/4) — the question.
- Issue [#5](https://github.com/cyberuni/cyber-sdd/issues/5) — the unwired floor. Independent;
  cited as evidence (E5).
- Issue [#3](https://github.com/cyberuni/cyber-sdd/issues/3) — in flight. ADR-0034 keeps the
  frozen `.feature` and the scenario map its pre-flight tell presumes, so #3 is reinforced
  rather than invalidated. Its ship was told directly.
