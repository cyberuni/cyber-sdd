# Evidence log

Fetched = page retrieved via WebFetch (summarized by a small model, so paraphrase risk). Snippet = web search result
text only. Local = file read in full or in part.

| ID | Claim | Source | Type | Confidence | Notes |
|---|---|---|---|---|---|
| E-CT-1 | A specification is intent plus criteria; criteria are over the outcome and evaluable against a blackbox | /home/unional/code/cyberuni/cyber-truss/apps/web/src/content/docs/model/specification.md | Local, project model (status Settled) | High | |
| E-CT-2 | Criteria are authored via use cases (actors incl. affected non-actors, extensions) -> decision graph -> criteria, each bound to a use case | same | Local (status Thesis) | Medium | Thesis, not settled |
| E-CT-3 | Implicit criteria may be left unstated by decision; recorded like any decision | same | Local (Thesis) | Medium | |
| E-CT-4 | Not every artifact-set needs a spec; specs exist at multiple levels; one home per fact | same; relationship-to-sdd.md | Local | Medium | "one home per fact" is the user's framing from the technical-writer skill and architect bar |
| E-SDD-1 | Oracle bar: one intent (name without "and"), bounded stated scope, every surface element paid for by a use case, worth shipping, strict (invariants not in suite) | ~/.claude/plugins/cache/cyberplace/sdd/0.6.1/skills/oracle-spec-governance/SKILL.md | Local, project bar | High | |
| E-SDD-2 | Spec-format: What/Non-goals/Key terms, Use Cases enumerated by actor not entry point, extensions = any path not reaching success; `extensions: none` is a claim | .../spec-format-governance/SKILL.md (first part read; later part truncated) | Local | High | Rest of file not read |
| E-SDD-3 | Builder bar: every CFG edge covered, every extension a path in the graph, every scenario a testable boolean, never derive scenarios from prose | .../builder-spec-governance/SKILL.md | Local | High | |
| E-SDD-4 | Architect bar: one home per knowledge, coincidental resemblance is not duplication, no conflict, placement, well-formed graph | .../architect-spec-governance/SKILL.md | Local | High | |
| E-EX-1 | Finished node spec has What, Non-goals, Key terms, Use Cases (actors table, UC entry/inputs/outcome/extensions), Control Flow, Scenario map, References | /home/unional/code/spikyuni/uni-agent-kit/packages/agent-kit/.agents/spec/dependencies/README.md | Local | High | headings via grep; first 7000 chars read |
| E-RFC-1 | Rust RFC template: Summary, Motivation, Guide-level, Reference-level, Drawbacks, Rationale and alternatives, Prior art, Unresolved questions, Future possibilities | https://raw.githubusercontent.com/rust-lang/rfcs/master/0000-template.md | Fetched, official template | High | |
| E-PEP-1 | PEP 1: Motivation, Specification "detailed enough to allow competing, interoperable implementations", Rationale, Backwards Compatibility, Security, How to Teach, Reference Impl, Rejected Ideas, Open Issues; rejected for insufficient motivation or BC treatment | https://peps.python.org/pep-0001/ | Fetched, official | High | |
| E-PEP-2 | PEP 12 template headings (Abstract ... Copyright) | https://peps.python.org/pep-0012/ | Fetched, official | High | |
| E-GOO-1 | Google design doc: Context and scope (not a requirements doc), Goals and non-goals (non-goals are plausible goals excluded, not negations), Design, Alternatives considered, Cross-cutting concerns; skip when solution is unambiguous; 1-3 page mini doc | https://www.industrialempathy.com/posts/design-docs-at-google/ | Fetched, primary (author Malte Ubl) | High | |
| E-ADR-1 | MADR: Context and Problem, Decision Drivers, Considered Options, Decision Outcome, Consequences, Confirmation (how compliance is verified) | https://adr.github.io/madr/ | Fetched, official | High | Confirmation is a spec-relevant idea |
| E-EARS-1 | EARS patterns: ubiquitous, state-driven (While), event-driven (When), optional (Where), unwanted behaviour (If/Then), complex; targets imprecision of free prose | https://alistairmavin.com/ears/ | Fetched, primary (author) | High | |
| E-KIRO-1 | Kiro feature specs: requirements.md uses "WHEN ... THE SYSTEM SHALL ..." (EARS); design.md; tasks.md | https://kiro.dev/docs/specs/feature-specs/ ; https://kiro.dev/docs/specs/ | Fetched, vendor docs | Medium | /specs/ page did not mention EARS; /feature-specs/ did |
| E-SK-1 | spec-kit: "Focus on WHAT users need and WHY", "Avoid HOW"; every feature traces to a user story with acceptance criteria; no speculative features | https://github.com/github/spec-kit/blob/main/spec-driven.md | Fetched, vendor repo | Medium | summarizer; "unit tests" wording is summarizer's |
| E-SK-2 | spec-kit: mark ambiguities with [NEEDS CLARIFICATION], none may remain; checklist "Requirements are testable and unambiguous", "Success criteria are measurable" | same | Fetched | Medium | |
| E-OS-1 | OpenSpec: Requirement headings with SHALL, Scenarios with WHEN/THEN, ADDED deltas merged at archive | https://github.com/Fission-AI/OpenSpec | Fetched, repo README | Low | page gave no validity rules |
| E-29-1 | 29148 individual characteristics: necessary, complete, singular, unambiguous, correct, verifiable, appropriate/feasible; set: complete, consistent, feasible, comprehensible, validatable | https://www.modernrequirements.com/?p=32595 | Fetched, vendor blog (secondary) | Low-Medium | page says nine but lists seven; standard text not read |
| E-830-1 | IEEE 830 characteristics: correct, unambiguous, complete, consistent, ranked, verifiable, modifiable, traceable; superseded by 29148 | https://www.slideshare.net/slideshow/se-lect11-btech/14410710 and standards store pages (search snippet) | Snippet, secondary | Low-Medium | not verified in standard |
| E-GH-1 | Gherkin: describe what not how; declarative over imperative; test: would wording change if implementation changes | https://cucumber.io/docs/bdd/better-gherkin/ | Fetched, official docs | High | one-behavior-per-scenario not on this page |
| E-DBC-1 | DbC: preconditions, postconditions, invariants; contracts can be comments or tests | https://en.wikipedia.org/wiki/Design_by_contract | Fetched, tertiary | Medium | |
| E-DIA-1 | Diataxis reference: describe and only describe, neutral, consistent, mirrors product, accurate; consulted not read | https://diataxis.fr/reference/ | Fetched, primary | High | |
| E-PRF-1 | PR/FAQ: who is the customer, what problem from customer's view, most important benefit; internal FAQ for hard problems; first draft in hours | https://www.workingbackwards.com/resources/working-backwards-pr-faq/ | Fetched, practitioner site | Medium | one-page limit not stated |
| E-SU-1 | Shape Up pitch: Problem, Appetite, Solution, Rabbit holes, No-gos; right level of abstraction | https://basecamp.com/shapeup/1.5-chapter-06 | Fetched, primary | High | |
| E-SU-2 | No-gos are deliberately excluded scope | same | Fetched | High | |
| E-AIP-1 | Google AIP: design review keeps API simple, intuitive, consistent; AIPs must not duplicate or contradict each other | https://google.aip.dev/100 ; https://google.aip.dev/8 | Snippet, official | Medium | pages not opened |
| E-FOW-1 | Fowler/Böckeler: spec = structured behavior-oriented artifact; spec-kit review overload; Kiro 4 stories and 16 criteria for a bug fix; agents skipped instructions; level of detail unsettled; spec-first/anchored/as-source | https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html | Fetched, primary (practitioner) | Medium | summarizer; opinion from hands-on trial, n small |
| E-AI-1 | LLMs guess unspecified requirements about 41% by default; underspecified prompts about 2x more likely to regress; adding requirements does not reliably help | https://arxiv.org/abs/2505.13360v1 | Snippet (abstract-level), research | Medium | not read in full |
| E-AI-2 | Models struggle to tell well- from under-specified tasks; clarifying questions raised performance up to 74% | https://arxiv.org/pdf/2502.13069 | Snippet (abstract-level), research | Medium | |
| E-AI-3 | Context files gave no gain and raised inference cost over 20%; human files should be minimal; earlier version worded more cautiously | https://arxiv.org/pdf/2602.11988 | Snippet (abstract-level), research | Medium | AGENTS.md not specs; indirect |
| E-AI-4 | Agents may skip written instructions; verification still the human's role | E-FOW-1 | Fetched | Medium | same source |

## Contradictions

- E-KIRO-1: two Kiro pages differ on EARS mention; the Fowler article says GIVEN/WHEN/THEN. Not resolved.
- E-830-1: store pages disagree on whether 830 is superseded or current.
- E-AI-3: abstract versions differ in strength of the negative finding.
