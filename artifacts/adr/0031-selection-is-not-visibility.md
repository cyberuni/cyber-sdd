# ADR-0031: Skill Selection Is Not Skill Visibility

## Status

Accepted

Amends [ADR-0005](0005-skill-taxonomy.md) (adds the Selection and Visibility axes).
Supersedes the dual-marker decision in [ADR-0013](0013-governance-skills.md).

## Context

"Kind" has been one word covering several independent properties of a skill, and two of them were
collapsed into each other:

- **Selection** — how a skill gets chosen: the model matching its `description` against the current
  situation, a caller naming it, or an event firing.
- **Visibility** — whether the skill appears in the user's command list.

They correlate strongly. A skill loaded only by name usually should not clutter the command menu, so
in practice both were expressed by the same frontmatter field, `user-invocable: false`. Tooling then
read that field as proof of selection behavior. The `improve-skill` validate engine classified any
skill with `user-invocable: false` as a by-name skill and required its description to shed all
trigger language (issue #380).

The correlation is not an identity. A skill can legitimately be **hidden yet situational** — a
governance enforcement rule that should load automatically when a relevant tool runs, while being
noise in a command menu. For such a skill the validator demanded a description rewrite that broke the
automatic loading it depended on. The case was reported from an external repo; a census of this
repo's 124 `SKILL.md` files found the combination zero times here, which is why the conflation
survived so long.

ADR-0005 fixed the taxonomy's axes (Placement, Pattern, Role, Style, Capabilities, Knowledge,
Activation) but has no axis for either property. Its "Activation" means *hook lifecycle event*
(`session-start`, `post-tool-use`) — a third sense of the word, unrelated to the situational-versus-
by-name distinction.

ADR-0013 decided the opposite of what is now needed. To mark reference content non-user-invocable it
required **both** `user-invocable: false` and an `Internal skill:` description prefix, defending the
pair as "belt-and-suspenders by necessity, not redundancy — the two markers cover disjoint harness
capabilities." That reasoning was sound for its problem (harnesses differ in whether they honor the
frontmatter field) but it establishes the frontmatter field as a selection marker, which is exactly
the coupling #380 reports. Since then the prefix spelling drifted from `Internal skill:` to
`Partial Skill:` across 52 skills without ADR-0013 being updated, so the corpus follows a convention
no ADR records while the ADR of record describes one four skills still follow.

## Decision Drivers

- A hidden skill must be able to stay situationally triggered.
- The signal must work on harnesses that do not honor any particular frontmatter field.
- Whatever declares selection must be visible to the model, since the model is what does the matching.
- Prefer one signal over a synchronized pair; ADR-0013's negative consequence was "two markers to keep in sync on every governance skill."
- Avoid adding a fourth sense of "activation".

## Considered Options

### Option 1: Keep `user-invocable` as the classifier, document the exception

- **Pros**: no migration.
- **Cons**: does not fix #380 — the hidden-situational skill still has no way to declare itself.

### Option 2: Re-key classification to a description prefix

Classify by a `"Partial Skill:"`-style prefix; leave the rest of the description free-form.

- **Pros**: small migration; the marker sits where the model reads.
- **Cons**: the prefix is only a *label* — the rest of the description remains rich and matchable, so accidental activation is still possible. Requires prose parsing to classify.

### Option 3: A new dedicated frontmatter field

Declare selection explicitly, e.g. `selection: by-name`.

- **Pros**: machine-readable; no prose parsing; composes with registry/tag resolution.
- **Cons**: the model does not read arbitrary frontmatter as an instruction, so the field would not actually prevent matching — it would only describe an intent the description could still contradict. Inherits ADR-0013's cross-harness support problem.

### Option 4: The minimal description *is* the declaration

A by-name skill's `description` is exactly `"By name only"` and nothing else.

- **Pros**: self-enforcing — a description with nothing in it to match cannot be matched, on any harness, with no field support required. One signal. Classification is a string comparison.
- **Cons**: migrates every by-name skill; all such skills share one description; identity moves to the body and README.

## Decision

**Selection and Visibility are separate axes.**

1. `user-invocable` is a **visibility** flag only. It controls command-list presence and never
   determines how a skill is selected. No tool may infer selection behavior from it.
2. A **name-only skill** declares itself by setting `description` to exactly `"By name only"`.
3. That minimal description is the enforcement mechanism, not a label for one. Identity — what the
   skill is, who calls it, what it returns — moves to the body and README.
4. Whether a skill can run standalone ("partial") is **documentation**, not a declared kind. A
   self-contained engine and a fragment of a larger capability are selected identically and carry
   identical descriptions, so no tooling distinguishes them.

## Rationale

Option 4 wins on the driver that eliminates the others: the description is the only thing the model
matches against, so it is the only place a declaration can *be* the enforcement rather than describe
it. A prefix (Option 2) labels a description that remains matchable. A frontmatter field (Option 3)
states an intent the description can silently contradict, and reintroduces ADR-0013's cross-harness
problem — a field an unaware harness ignores is not a guarantee.

This also resolves ADR-0013's stated negative consequence. Its two markers existed because neither
alone was sufficient: the field failed on unaware harnesses, the prefix was only advisory. A minimal
description needs no harness support at all — there is nothing to honor or ignore — so one signal
replaces the pair.

Demoting "partial" follows from the same reasoning. It is a true and useful thing to say about a
skill, but nothing mechanical follows from it: both fragments and complete engines are addressed by
name and both need unmatchable descriptions. A distinction no check can act on belongs in prose.

## Consequences

### Positive

- A hidden situational skill is expressible: `user-invocable: false` with normal trigger language.
- Accidental activation of by-name skills is prevented structurally, not by convention.
- One marker instead of ADR-0013's synchronized pair.
- The `improve-skill` engine sheds its kind-aware description checks; `user-invocable` becomes inert to it.
- Classification is a string comparison, not prose parsing.

### Negative

- Every by-name skill's description is rewritten (~56 `SKILL.md` plus agent definitions).
- All name-only skills share one description; they are distinguished only by `name`.
- Harness listings that display descriptions show the marker rather than a summary.
- External repos following the `Partial Skill:` convention diverge until they migrate.

### Risks

- A subagent whose parent selects it *by description* cannot be name-only; those must keep a real
  description. Applies to agent definitions chosen by role rather than named outright.
- "Partial" remains in informal use and may drift back toward being treated as a kind.

## Implementation Notes

- `description: "By name only"`, exact string, for every name-only skill.
- The four skills still on ADR-0013's `Internal skill:` prefix migrate with the rest.
- `improve-skill`: retire the operational-detail and trigger-language-on-a-partial checks, re-key the
  prefix check to "description carries text beyond the marker", and exempt name-only skills from the
  trigger-language and description-word-count checks.
- Selection is documented on the website under Skills; the corpus census behind this decision is in
  `.research/skill-kind-axes/conclusion.md`.

## Related Decisions

- [ADR-0005](0005-skill-taxonomy.md) — skill taxonomy; this adds the Selection and Visibility axes it lacked
- [ADR-0013](0013-governance-skills.md) — governance skills; this supersedes its dual-marker requirement
- [ADR-0001](0001-governance-vs-discipline-taxonomy.md) — governance vs discipline
- [ADR-0003](0003-agent-first-authoring.md) — agent-first, self-contained bodies
