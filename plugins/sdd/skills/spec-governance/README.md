# spec-governance

Non-user-invocable SDD skill holding the **universal** spec-authoring rules: the `.feature` format bar (valid Gherkin, boolean scenarios, no embedded rubric), the step-down scenario-ordering convention, and the `spec.md` enrichment / human-readability rule (diagrams, tables, short paragraphs).

Loaded via the harness (`Skill`) by every spec-producer — the SDD default (the Operator running `spec-producer-governance` inline, recorded `sdd:sdd-operator`) and plugin producers (`aces-scenario-writer`, `quill-writer`) — and by `sdd-spec-judge` at the gate. It replaces the old `governance show` CLI call (ADR-0013): reference content lives in a harness-loaded skill, not a NodeJS runtime call, and not in project-global `AGENTS.md`.

A domain's **own** criteria are separate and additional, enforced by that domain's spec-judge; this skill is only the universal bar.
