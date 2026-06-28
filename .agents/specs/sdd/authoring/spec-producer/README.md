---
spec-type: behavioral
---

# spec-producer — grill a CR into spec prose + a boolean suite

The authoring **procedure**: pressure-test a CR's intent into `spec.md` prose plus boolean
scenarios. This is the default `spec-producer-governance` the **conductor** runs **in-session** for
the producer role; a plugin may resolve a more capable producer for its domain
(`../../design/governance-resolution.md`). Run in-session (the default), it **grills the human
live**; run **headless** (the spawned-operator fallback, `../../design/harness-spawning.md`) it has
no user channel, so it grills up front and records an `<!-- open: -->` marker for anything it
cannot resolve rather than prompting mid-run.

`.feature` is **part of the behavior suite, never part of the CR** — the producer *writes* the
suite delta, it does not receive it.

## Use Cases

**Subject** — the spec-producer procedure: turning one CR into a spec + suite diff.
**Non-goals** — it renders no gate verdict, freezes nothing, and emits no digest (those are
`../validate-spec/`); it does not write the control frontmatter (`status` / `aligned` /
`approval` / `produced-by`).

The procedure runs in one of **three modes** — the distinct ways it is invoked:

| Trigger | Inputs | Outcome |
|---|---|---|
| **create** — a CR for capability content that does not exist yet | the CR + answers to the up-front grill: the core problem and who experiences it, observable behavior from the user's view, the public interface (commands, signatures, events), known edge cases or explicit non-goals, and which reviewers must be heard | scaffolded spec prose + an initial set of boolean scenarios |
| **revise** — a CR touching a capability whose prose + scenarios already exist | the CR + the existing spec | tightened prose and scenarios; **no** new skeleton scaffolded |
| **backfill** — a CR whose behavior already exists in code | source, tests, and history | inferred *what* / *why* / decisions; the up-front grill is **skipped** |

Each use case is exercised under the grilling discipline below, and the producer always writes
within the output boundary that closes this spec. Every scenario in
[`spec-producer.feature`](./spec-producer.feature) maps to one of these three modes.

## The grilling workflow

**Breadth-first, depth one-at-a-time.** First scan the CR holistically and summarize every
issue found; then grill the single most important issue to resolution before the next — one
deep thread, not many shallow. Restate the summary plus the current focused issue at each step.

Two phases, in order: **grill the prose first** to settle the contract's intent, **then** bring
the `.feature` into line. Editing scenarios before the prose is settled wastes work — the
scenarios chase a moving target.

Phase 1 — the prose:

- **Scope** — is the touched behavior still *one* coherent thing? Grilling that reveals a
  bundle of several is the moment to recommend a split (a `../../corpus/` operation), not to
  grow a monolith.
- **Use cases / entry points** — is each trigger, input, and outcome still accurate? Did the
  change add, remove, or alter an entry point?
- **Design decisions** — does any decision now contradict the change, a sibling capability, or
  a governance? Reconcile stale terms and claims **toward the correct answer, not the popular
  one**: when two statements conflict, zoom out and reason about which is actually right given
  the design's intent and the whole model. Corroboration count, what the implementation does,
  and which decision is most recent and authoritative are *evidence* to weigh — not a vote to
  tally. Fix the side that is wrong; never reword a rule merely because more files echo it. If
  the right answer is genuinely unclear, raise it as a `CONTENT_GAP` rather than guessing a
  reconciliation direction.
- **Open items** — resolve every `<!-- open: -->` marker the diff touches; leave none dangling.

Phase 2 — the suite:

- Every use case maps to one-or-more scenarios; add scenarios for new behavior, retire
  scenarios for removed behavior.
- Each scenario stays a pure boolean `Given`/`When`/`Then` (or the rubric form per
  `../suite-format/README.md`); tighten any that drifted.
- Step-down ordering and stage grouping still hold after the edits.

## The output boundary

The producer writes the **spec body and the `.feature`**, nothing else:

- It writes `spec.md` prose and the `.feature` scenarios.
- It does **not** write the `status`, `aligned`, `approval`, or `produced-by` frontmatter —
  those are the conductor's and the gate's (`../../design/provenance-model.md`).
- Scoring lingo appears **only** inside a `@rubric`-tagged scenario; every untagged scenario
  stays a pure boolean assertion (`../suite-format/README.md`).

**Producer/judge separation.** The producer authors the diff; a **distinct judge** actor
verifies it (`../validate-spec/`). The producer self-aligns against the same governances the
judge checks against — it never collapses producing and judging into one voice.
