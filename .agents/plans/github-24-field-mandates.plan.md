---
status: active
todos:
  - content: "intake: CR opened against sdd, all touched files tracked, restarted under sdd 0.4.0 entry-set rules"
    status: completed
  - content: "explore: author plugin/check-field-mandates spec.md + .feature inline (first attempt is reference only)"
    status: completed
  - content: "explore: dispatch the builder for a build-to-learn spike against the unfrozen suite"
    status: completed
  - content: "spec gate: cold sdd-spec-judge (subagent strategy) to convergence, freeze check-field-mandates.feature"
    status: completed
  - content: "deliver: dispatch the builder — engine, one verification per frozen scenario, survivor fixes, check:fields"
    status: completed
  - content: "deliver: rebase onto main, pnpm verify green"
    status: completed
  - content: "impl gate: cold sdd-impl-judge (subagent strategy)"
    status: completed
  - content: "handoff: placement pass, changeset, commits, PR closing issue #24, follow-ups"
    status: completed
---

# CR github-24 — a skill's declared block and the prose mandating it must agree

Source: https://github.com/cyberuni/cyber-sdd/issues/24

## Intent

Skill and agent definitions ship structured blocks (`Input`, `Output`, dispatch payloads) whose
fields the prose also mandates. Nothing checks the two against each other, so a field can be
mandated and never carried, or carried and never explained. Land a deterministic check over
`plugins/*/skills/**/SKILL.md` and `plugins/*/agents/*.md` reporting both directions, file + token.

Out of scope: validating persisted ledger records against their contract (tracked separately).

## Owner decisions (in-session)

- **block → prose reads as "explained"** — a gloss on the declaration, or a prose mention. The
  literal "named in the prose" reading was measured at 97 live hits, nearly all glossed fields.
- **Every live survivor is fixed in this CR**, aced and quill definitions included — no allow-list.
- **The first attempt's draft is reference only** — re-authored through the grill.
- **Actors** — the owner was unsure; the affected parties are taken from the issue's own words (a
  conductor constructing a payload, a producer declaring into it, a judge reading it).

## Resolution

No `universal-plugin.json` registry: every role resolves to the SDD default chain. Node placed at
`plugin/check-field-mandates/` (behavioral, `concept: plugin`) beside `check-plugin-manifests`.
Judges and builder dispatch by the subagent strategy (defs carry no `warm` / `interactive`).

## NEXT

Landed. Both gates passed and self-asserted `by: agent` within leash; no resume action remains.

- **Spec gate** — `check-field-mandates.feature` frozen at 37 scenarios after two cold rounds of the
  restarted loop (round 2 ALIGNED across oracle, builder and architect), plus one additive
  detail-adjustment after the freeze (38). No existing `.feature` was touched.
- **Impl gate** — IMPLEMENTATION_PASS on round one: 38/38 with oracles re-derived independently,
  live tree clean over 93 definitions, the judge's own mutation sweep with no contract defect.
- **Landed** — the engine runs in `verify` as `check:fields`; eleven shipped definitions were fixed
  (three missing `BLOCKER` lines, nine glossed Input lists, two reasoned ignore markers).

Three backlog follow-ups are recorded in the ledger shard.
