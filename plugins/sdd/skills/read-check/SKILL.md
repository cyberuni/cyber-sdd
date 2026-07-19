---
name: read-check
description: "Partial Skill: invoke by name only — read-check's engine that lints a role's read-attestation for presence and parroting — used by the gate that wires attestation into a role's return, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Read Check

The concrete engine for **read-check** (`.agents/specs/sdd/mission/read-check/`). Verifies a spawned
role's **read-attestation** — the governances it loaded for the decisions it made, each paired with a
restatement of that governance's `## Key points (read-check)` in the role's own words. Self-contained
`.mts` (the repo's node-≥23.6 / no-deps convention).

**Mechanical only — this is the LINT half, not the judge.** Per the spec's form-vs-judged split
(`../../authoring/suite-format/`), this engine checks only what a machine can certify:

- **Absent** — no attestation at all → fail, naming that nothing was attested.
- **Coverage** — for each governance the attestation names as *loaded*: if its SKILL.md carries a
  `## Key points (read-check)` section, a restatement is required; a missing one fails, naming the
  governance. Six governances (`lifecycle`, `gate-validation`, `combat-log`, `plugin-contract`,
  `solution-producer`, `spec-producer`) carry no such section — naming them suffices.
- **Parroting** — a restatement whose word-6-grams overlap the source key-points text at or above 25%
  fails as copied, not read. High overlap is certain evidence of copying; low overlap proves nothing
  about whether the directive was understood, so the engine never passes anything on the strength of
  low overlap — it only ever fails on high overlap.
- **Scope** — only the governances the attestation names as loaded are ever checked. A role's other
  declared-but-unloaded bars are never required here (breaking that would silently convert SDD's
  lazy-load rule into eager loading).

**What it does NOT do.** It renders **no verdict on meaning** — whether a restatement actually tracks
its directive is judged, by a cold reader, never by this lint. A clean run here clears no honesty
question; it only proves nothing is missing and nothing is copied.

## Run it

```bash
node "<skill>/scripts/read-check.mts" --attestation <path-to-attestation.json> --skills-dir <dir>
```

- `--attestation` — path to the role's read-attestation, JSON of the shape
  `{ "governances": [{ "name": "<governance-slug>", "restatement"?: "<own-words text>" }] }`. JSON, not
  markdown: the attestation is machine-produced (part of a role's structured return), so there is no
  authoring-ergonomics reason to prefer markdown, and JSON gives an unambiguous name/restatement pairing.
- `--skills-dir` — the directory holding `<governance-name>/SKILL.md` for every governance the
  attestation might name (e.g. `plugins/sdd/skills`). Defaults to `plugins/sdd/skills`.

Exit 0 and a stdout line on a clean lint; exit 1 with one `✗ ...` line per violation on stderr
otherwise. Read-only — the engine writes nothing.

When `node` is absent, an agent performs the same checks by hand: fail if no attestation was returned;
for each named-as-loaded governance, open its SKILL.md, and if it has a `## Key points (read-check)`
section, require a restatement is present and is not a near-verbatim copy of that section.

## Boundaries

Presence and parroting only — it never grades restatement *quality* or *accuracy* (that is the cold
judge's job, per the spec's D5 edge). It never requires attestation for a governance the role did not
name as loaded, even if that governance is among the role's declared bars. It writes nothing and holds
no state across runs. Wiring roles to actually emit an attestation, and gating on this engine's result,
is a separate unit — this skill is the checker, not the mechanism that produces or enforces the input.
