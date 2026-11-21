# ADR-0019: Configurable extra spec anchors — an opt-in registry on top of the fixed conventions

## Status

Accepted

## Context

[ADR-0017](0017-frontmatter-is-the-router-index.md) and its discover-specs amendment narrowed spec
recognition to **location-bounded AND shape-confirmed**: a spec is a git-tracked `spec.md` that sits
at one of **three fixed conventions** (`.agents/spec/`, `.agents/specs/<project>/`,
`<project-path>/.agents/spec/`) **and** carries a lifecycle `status`. A load-bearing property of that
design was that the locations are **fixed conventions, not a stored registry** — discovery is a pure
derivation, so no second place can drift (encoded as the frozen `discovery.feature` scenario
*"discovery consults no path registry"*).

GitHub issue **#39** asks to support specs at **non-standard paths** (e.g. `source/spec.md`, or a
curriculum session tree). Its literal proposal — a `spec-layout` frontmatter field declaring a spec's
own location — is rejected on two counts: (1) `spec-layout` frontmatter was *removed* by ADR-0017 and
the name now denotes organization strategy; (2) a scan-based discovery cannot read a file's
frontmatter to learn where that file is (chicken-and-egg). The genuine need — *let a project point
discovery at extra locations* — is real but low-priority ("the current standard paths work").

The only coherent way to satisfy it is the issue's own alternative: a **project-level config** that
adds scan locations. That reintroduces exactly the **stored registry** ADR-0017 kept out of the
derived hot path. So this decision must consciously overturn that invariant for the extra-anchor
case, and contain the drift risk it reopens.

## Decision Drivers

- **Serve the off-convention project** without weakening the fixed-convention hot path.
- **Contain drift.** A stored registry is a second source of truth that can rot; keep it opt-in,
  narrow, and curated rather than hand-edited.
- **Back-compat is sacred.** A repo with no config must behave exactly as today.
- **Fail-safe on the router hot path.** The gateway scans discovery on every entry; a corrupt config
  must never crash it.

## Considered Options

### Option 1: Do nothing (close #39 as out-of-model)

- **Pros**: preserves the pure-derivation invariant; zero code.
- **Cons**: leaves off-convention projects unserved; the question recurs.

### Option 2: Invocation-time override (env var / CLI flag), no stored file

- **Pros**: no stored registry, so no in-repo drift; fixed conventions stay the only durable truth.
- **Cons**: not persistent — every consumer (gateway, start-mission, CI) must pass the flag, so a
  project's own layout is not self-describing; poor UX for the exact "my specs live here always" need.

### Option 3 (chosen): Opt-in persistent config, curated through a manage skill

- **Pros**: persistent and self-describing per repo; additive (never replaces the fixed conventions);
  drift contained by (a) opt-in — absent config ⇒ today's behavior, (b) a **manage skill** that
  lists / validates / previews before writing, and (c) fail-safe discovery that ignores a bad config.
- **Cons**: it *is* the stored registry ADR-0017 forbade — a genuine reversal of that invariant for
  the extra-anchor case; a second source of truth now exists.

## Decision

Add an **opt-in extra-anchor registry**, `.agents/sdd/spec-anchors.toml`, scanned **in addition to**
(never instead of) the three fixed conventions:

```toml
anchors = [
  "source",                             # → source/spec.md
  "curriculum/sessions/*/*/<project>",  # → …/<session>/spec.md, name from the <project> capture
]
```

- Each entry is a repo-relative pattern naming the **directory** holding a `spec.md`; `*` globs a
  segment, `<project>` globs **and** captures a segment as the spec's name (name-source `derived`;
  else basename `guessed`; a frontmatter `name` always wins as `declared`).
- The three fixed conventions remain **implicit and always scanned**; they are never listed in the
  file, and the config can only **add**.
- **Absent config ⇒ exactly today's behavior** (the fixed conventions alone).
- **Discovery is fail-safe:** an unreadable or malformed `spec-anchors.toml` is ignored with a
  warning; discovery falls back to the fixed conventions and never crashes the gateway scan.
- The config is **curated through the `manage-spec-anchors` skill** (routed via the `manage`
  gateway): list fixed (explained) + custom, CRUD the custom entries, induce a pattern from a sample
  path, and preview which project(s) a pattern matches before it is saved.

This **partially supersedes ADR-0017's "not a stored registry / pure derivation" clause**: the fixed
conventions remain a pure derivation, but the extra-anchor set is now a declared registry. The frozen
`discovery.feature` *"consults no path registry"* scenario is retired (a pre-authorized Clearance
narrowing) and replaced with extra-anchor recognition scenarios.

## Rationale

Option 2 keeps the invariant intact but fails the actual need: a project's layout should be
self-describing, not re-supplied by every caller. Option 3 accepts a stored registry but pays down its
one real cost — drift — with three compounding guards (opt-in, curated-with-preview, fail-safe read),
so the reintroduced registry cannot silently rot the way ADR-0017 feared: it is absent by default,
never written without validation + preview, and never trusted blindly by the reader. The fixed-path
hot path is untouched, so the router test ADR-0017 optimized for still holds for the common case.

## Consequences

### Positive

- Off-convention projects (e.g. `ai-curriculum` sessions) can be discovered without moving files.
- Back-compat is total: no config ⇒ byte-identical discovery.
- Curation UX means users never hand-edit the registry; the preview closes the "did I write the right
  glob?" gap before it costs a missed spec.

### Negative

- A second source of truth (the registry) now exists and can drift — the property ADR-0017 removed,
  reintroduced (bounded, opt-in) for the extra-anchor case.

### Risks

- A wrong pattern silently widens or narrows the discovered set — mitigated by `--preview` and by
  discovery's shape filter (a matched non-spec `spec.md` without a `status` is still excluded).
- Config corruption on the gateway hot path — mitigated by fail-safe discovery (warn + fall back).

## Implementation Notes

- `discover-specs.mts` reads the config (no-deps TOML subset), merges declared anchors into the scan,
  and derives names for anchored specs (`<project>` capture → derived, else basename → guessed,
  frontmatter `name` → declared). Back-compat covered by a "no config ⇒ identical output" test.
- New `manage-spec-anchors` skill + `.mts` engine (`--list` / `--add` / `--remove` / `--edit` /
  `--induce` / `--preview`), routed under `manage`'s Housekeeping group.
- Reconciled sites: `corpus/discovery` (spec + suite), the new `corpus/spec-anchors` node,
  `gateway/manage` (spec + skill), `corpus/README`, `lifecycle-governance`, and the skill docs that
  restate the three-location set.

## Related Decisions

- [ADR-0017](0017-frontmatter-is-the-router-index.md) — its "not a stored registry / pure derivation"
  clause is **partially superseded** here (extra anchors are a declared registry; the fixed
  conventions remain derived).
