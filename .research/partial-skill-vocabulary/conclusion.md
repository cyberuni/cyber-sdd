# Partial-skill vocabulary — governance vs the neighboring terms (July 2026)

Background survey distilling a working note on how "governance" relates to principle / policy / standard / guideline / procedure / discipline / framework, and where the repo's `*-governance` skills actually sit. **This repo's decisions already settle the question** — see [ADR-0001: Governance vs Discipline Taxonomy](../../artifacts/adr/0001-governance-vs-discipline-taxonomy.md), [ADR-0013: Governance Skills](../../artifacts/adr/0013-governance-skills.md), [ADR-0014: Split SDD lifecycle into named governance skills](../../artifacts/adr/0014-sdd-governance-split.md), and [ADR-0006: "Agent Extension" as cross-layer term](../../artifacts/adr/0006-agent-extension-terminology.md). This note is **evidence, not a normative rule** — it does not reopen those decisions.

---

## The terminology field

A generic ontology distinguishes eight terms by the question each answers:

| Term           | Question it answers                          | Focus                    |
| -------------- | -------------------------------------------- | ------------------------ |
| **Governance** | Who decides, who is accountable, how?        | Decision rights, oversight |
| **Principle**  | What values guide us?                        | Intent                   |
| **Policy**     | What must / must not be done?                | Mandatory rules          |
| **Standard**   | Exactly how is something implemented?        | Precise, measurable specs |
| **Guideline**  | What is the recommended way?                 | Flexible best practice   |
| **Procedure**  | What are the steps?                          | Execution                |
| **Discipline** | What body of practice is this?               | Field of expertise       |
| **Framework**  | How do the pieces fit together?              | Structure                |

Rule of thumb: *governance governs; principles inspire; policies require; standards specify; guidelines advise; procedures instruct; disciplines organize expertise.*

The load-bearing distinction for agent frameworks is **governance (decision rights, approvals, audits, exceptions) vs standard (precise, measurable requirements)**. A bucket of rules like "follow the design system / write Storybook tests / use strict mode" is *standards*, not governance — most engineers reserve "governance" for oversight and accountability, so naming an operating-rules bucket "governance" mis-signals.

## The three layers for an AI agent

1. **Instructions** — task-specific ("implement this feature").
2. **Operating rules** — persistent behavioral guidance ("follow the design system", "don't modify generated files").
3. **Governance** — oversight and control ("all UI changes must comply", "security-sensitive changes require human review", "cannot merge without CI").

## Where this repo already landed

The tension above is exactly what ADR-0001 resolved. The repo deliberately overloads neither term:

| Repo layer | Term chosen | What it is | Mechanism |
| ---------- | ----------- | ---------- | --------- |
| Version-pinned auditable contracts | **Governance** | Normative rules for a domain, crisp enough for static analysis | `governances/*.md`, loaded via `cyberplace governance show`, enforced by `audit-skill` |
| Always-on ambient habits | **Discipline** | Cross-cutting habits shaping any agent (e.g. Commit Discipline) | SessionStart hook, AGENTS.md |
| SDD actor bars | **Governance skills** | Reference content — the bar a producer/judge loads at a gate | `user-invocable: false` partial skills (ADR-0013), split per lifecycle concept (ADR-0014) |

ADR-0001's tagline: **governance defines what is correct; discipline defines what is habitual.** The repo's "governance" is *the standards sense* of the word (auditable, version-pinned) — an intentional choice made over "discipline only" and "governance only", not an accident. The 22 `*-governance` partial skills are the ADR-0013 application of the same term one level down: reference bars, loaded by name, that define what is correct for a producer or judge.

**Consequence for naming new bars:** a new `*-governance` skill is legitimate when it is a *normative, name-loaded contract* (a bar producers self-align to and judges verify against). If a candidate is really an ambient habit, it is *discipline*; if it is task steps, it is a *procedure/skill body*. The eight-term ontology above is a lens for that judgment, **not** a taxonomy to impose on the corpus — the repo's live distinction is the ADR-0001 governance/discipline split, plus ADR-0013's governance-skill shape.
