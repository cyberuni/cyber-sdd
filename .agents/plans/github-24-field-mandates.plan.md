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
    status: in_progress
  - content: "deliver: rebase onto main, pnpm verify green"
    status: pending
  - content: "impl gate: cold sdd-impl-judge (subagent strategy)"
    status: pending
  - content: "handoff: placement pass, changeset, commits, PR closing issue #24, follow-ups"
    status: pending
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

Spec gate self-asserted (round 2 ALIGNED; 37 scenarios frozen, plus one additive detail-adjustment = 38).
Builder is in implement mode: engine, 38 verifications, `check:fields` wiring, live tree green. Next:
rebase onto `main`, `pnpm verify`, then the cold impl-judge.
