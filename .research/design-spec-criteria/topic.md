# Design spec contents and criteria (October 2026)

## Question

What should a design spec contain, and what high-level criteria judge whether it is good (for a small agent skill on
writing and reviewing a spec)?

## Scope

In: the spec document and its review criteria; what is specific to agent consumers. Out: spec-driven process, task
planning, tooling, staleness mechanisms, implementation design.

## Source angles

- Local model and bars: cyber-truss specification.md and relationship-to-sdd.md; SDD oracle, builder, architect,
  spec-format governances (spec-format only partly read); the dependencies node spec.
- Design-doc practice: Rust RFC, PEP 1/12, Google design docs, MADR, Shape Up, PR/FAQ, AIP.
- Requirement-quality: EARS, IEEE 830, ISO/IEC/IEEE 29148, Gherkin, Design by Contract, Diataxis.
- Agent-era specs: Kiro, spec-kit, OpenSpec, Fowler/Böckeler, prompt-underspecification and AGENTS.md papers.

## Findings

### Sections

Almost every template has: problem/motivation, a statement of the thing (specification / design), non-goals or
no-gos, and open questions. Template-specific additions: alternatives and rationale (RFC, PEP, Google, MADR),
backward compatibility and security (PEP), appetite (Shape Up), customer-first framing (PR/FAQ), confirmation of
compliance (MADR). The SDD node spec adds actors, use cases with extensions, and a graph. See E-RFC-1, E-PEP-1,
E-GOO-1, E-ADR-1, E-SU-1, E-PRF-1, E-SDD-2.

### Quality criteria

Two families. Per-statement: unambiguous, verifiable, singular, necessary, complete (29148, 830, EARS, Gherkin,
spec-kit checklist, SDD builder). Per-set: consistent, no duplication, comprehensible, in scope (29148 set, AIP-8,
SDD architect and oracle). Cyber-truss adds two not found elsewhere in this form: outcome-level (evaluable without
the implementation) and every criterion bound to a use case with affected non-actors enumerated. The closest
external analogues are Gherkin declarative style and spec-kit "traces to a user story".

### Failure modes

Collected in conclusion.md F1-F12. Agent-era additions: verbosity (Fowler), silent guessing (spec-kit, CMU paper),
agent ignoring the spec (Fowler).

### Agent-specific

Ambiguity is filled by guesses that are fragile; more requirements do not reliably help; extra context costs tokens;
agents skip instructions, so a check independent of agent compliance matters. All evidence is abstract-level or
practitioner opinion. See E-AI-1 to E-AI-4, E-FOW-1.

### Mapping

The nine criteria in conclusion.md fold the oracle (C1-C3), builder (C5-C6) and architect (C7) bars plus the
cyber-truss outcome rule (C4), and add two from external practice only: C8 nothing hidden, C9 proportionate.

## Contradictions

See conclusion.md D1-D7 and evidence.md.

## Open questions

- Should the skill require a decision graph or leave it to branching behavior? (Currently: only when behavior branches.)
- Which criterion notation to standardize for this repo (EARS, Given/When/Then, or SDD scenarios)?
- How to check staleness (F10) outside a one-time review?
- Does C9 need a measurable limit (criteria count, length)? No source gives one beyond Google's page counts.

## Sources consulted

See evidence.md. Fetch failures: industriallogic.com Google-design-doc URLs returned 404 (replaced by
industrialempathy.com). Not fetched: ISO/IEC/IEEE 29148 and IEEE 830 text, Cucumber Gherkin reference, full arXiv
papers, Amazon primary PR/FAQ text, Fowler article in full (summarized by fetch tool).
