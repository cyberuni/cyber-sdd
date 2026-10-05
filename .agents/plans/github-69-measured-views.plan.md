---
status: active
todos:
  - content: "intake: confirm what #71 covered — bench: key landed; compare/report measured views did not"
    status: completed
  - content: "explore: additive measured-mode use cases + scenarios on eval-run/compare (aced-scenario-writer)"
    status: completed
  - content: "explore: additive measured-section use cases + scenarios on eval-run/report (aced-scenario-writer)"
    status: completed
  - content: "spec-judge: cold aced-spec-validator on both nodes, 3-round cap"
    status: completed
  - content: "handoff: PR with the spec additions; spec-gate verdict left to the owner"
    status: completed
  - content: "spec gate: owner ratifies (owner's act, not this mission's)"
    status: pending
  - content: "deliver: compare + report SKILL.md measured mode/section against the frozen additions"
    status: pending
  - content: "impl gate: cold aced-impl-judge on both skills; owner ratifies"
    status: pending
---

# CR github-69 step 4 remainder — `compare`'s measured mode and `report`'s measured section

Source: https://github.com/cyberuni/cyber-sdd/issues/69 (section 4, section 7 step 4; owner
decisions in the issue's last comment). Previous step: `github-69-bench-measured-layer` (PR #71).

## Intent

Give ACED's `compare` a measured mode over the bench engine's records and `report` a measured
section, so measured suites are diffed and rolled up beside simulated ones without ever sharing a
comparison, a key, or a trend line with them.

## Already covered by #71 (not redone)

The `eval.md` `bench:` key (`design/fit.md`, `aced-fit`, the plugin readme); the `file` and
`package` subjects; the engine's `compare` verb with the closed-form verdict.

## Settled (owner, issue #69)

Layer "measured", key `bench:`; dollars recorded and compared, never gate; ACED depends on no
consumer; measured and simulated records share `.agents/aced/results/` without sharing keys
(measured under `results/bench/<suite>/`).

## Shape

- `eval-run/compare/` — revise: additive measured-mode use cases, CFG edges, scenarios. The engine
  computes every statistic and the verdict; `compare` resolves records, calls it, and words the result.
- `eval-run/report/` — revise: additive measured-section use cases, CFG edges, scenarios.
- Both suites are `@frozen`; additions only, no existing scenario narrowed or rewritten.

## Adjacent, not widened

#75 (scenario-writer never declares `bench:`), #76 (check-freshness cannot see measured records),
#77 (no multiplicity correction — `compare` discloses the engine's test-count footer), #82.

## NEXT

Spec drafted and judged: cold aced-spec-validator ALIGNED on both nodes after three rounds; both
`@frozen` suites are add-only against the base (compare +25, report +14). Stopped at the spec gate —
the verdict is the owner's; no approval, gate line, or status written. On ratification: deliver the
`compare` and `report` SKILL.md changes (each with a `## Validate` section) against the frozen
additions, then the cold aced-impl-judge.
