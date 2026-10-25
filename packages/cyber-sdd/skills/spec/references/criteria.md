# Criteria for a design spec

Judge C1 to C9 in number order. C1 and C2 are cheap and kill early. C3 and C6 catch what is missing; the others catch what is
wrong or surplus. Each test is pass or fail. Report the line that fails.

## A. Intent and scope

| ID | Criterion | Pass when |
| --- | --- | --- |
| C1 | One intent | The outcome is nameable in one sentence without "and". Otherwise it is two specs. |
| C2 | Bounded scope | The non-goals include the plausible goals a reader would otherwise assume, each excluded on purpose. |
| C3 | Paid for by a use case | Every criterion and every exposed element (flag, option, parameter, event) traces to a use case with a named actor and a goal stated as a result. An element no use case needs is cut or justified. A goal that restates the function name has not found the use case. |

## B. Criteria quality

| ID | Criterion | Pass when |
| --- | --- | --- |
| C4 | Outcome-level | Someone without the code can decide each criterion from outputs alone. No criterion names a module, library, or internal step. Renaming an internal breaks none. Public names a consumer depends on (flags, exit codes, error codes) are outcome. |
| C5 | Checkable, unambiguous | Each criterion is a boolean with one reading and one behavior, with no unmeasured words ("fast", "appropriate", "sometimes"). You can write the failing case and a deterministic test for it, except for a criterion of a skill-instruction use case, which an eval run of the skill checks. |
| C6 | Complete over divergence | For each use case, every path that misses the goal (error, absent input, refusal, partial result, contended state) is a criterion, or the use case says `extensions: none, <why>`. A rule left unstated on purpose is recorded as that decision. |

## C. The spec as a set

| ID | Criterion | Pass when |
| --- | --- | --- |
| C7 | Consistent, one home | No criterion contradicts another, a sibling spec, or a convention. No fact is stated in two places; one is the home and the rest link. Two things that look alike but change for different reasons are not duplication. |
| C8 | Nothing hidden | Every unresolved question is under Open questions. No `TBD`, no guessed default, and nothing the criteria need is deferred. |
| C9 | Proportionate | The size matches the risk: a small change gets a few criteria, not a document. The spec states only what the code, the conventions, or a linked home do not. A task that reads the spec (changing one behavior, deriving its tests, checking a consumer contract) needs most of what it loads; otherwise it is several specs, split by capability and never by layer (library, CLI, skill). |

## Failure modes to look for

- The spec is the interface restated as requirements (use cases derived from entry points). Caught by C3.
- Implementation leaks in, so the spec breaks when the code is refactored. C4.
- Vague adjectives, or two behaviors in one line. C5.
- Happy path only, so the implementer invents the errors. C6.
- Criteria derived from the prose list rather than the decisions, so the suite can never reveal a hole. C6.
- The same rule in two places, drifting apart. C7.
- A plausible guess filled in silently. C8.
- Verbosity: a bug fix with a page of criteria. C9.
- An invariant that always holds listed as a criterion. It is not a decision. C3.

A one-time review cannot catch a spec going stale or being revised from the code it constrains. That needs a check
on each change, outside this skill.
