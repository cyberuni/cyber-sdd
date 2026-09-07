# Topic — colocate the node spec, or externalize the corpus? (September 2026)

## The question

[Issue #4](https://github.com/cyberuni/cyber-sdd/issues/4) proposes two next-version
directions for SDD's spec architecture and asks for **one** to be adopted, because they pull
in opposite directions on the same axis.

- **A — colocate.** The node level moves out of `.agents/specs/<project>/…` to sit next to the
  subject it specifies. The suite moves down into the implementation's own tooling (Gherkin or
  `evals.json` for skills, Vitest for TypeScript, Storybook for components), with freezing
  preserved but re-mechanized per form — possibly by **agent separation** (only a designated
  agent may write the tests) rather than a frozen artifact. Non-engineer readability comes
  from a generated summary rather than from the `.feature` itself.
- **B — externalize.** The spec is persisted somewhere that is *not* ordinary repository
  content — beads, a SQL store, a detached branch — so fewer files enter an agent's context by
  default. An agent that needs a fact asks a **second brain** a question instead of reading the
  corpus.

The issue names the discriminator itself: **placement** is where a fact lives relative to its
subject; **retrieval** is how much of the corpus enters a context window. Deciding which of
those is the expensive problem should separate A from B.

## Why this dossier exists

The issue asks for reasoning **and** an empirical trial, weighted equally, and says
explicitly that where the two disagree, the disagreement is the most useful finding and must
be surfaced rather than resolved away. It also warns against manufacturing a decision the
evidence does not support.

Both were done. They disagreed — not about which direction wins, but about **which half of
the winning direction is the dangerous one**. That inversion is the dossier's main result and
is recorded in [`conclusion.md`](./conclusion.md).

## Scope

**In**

- One trial subject: the `place-node` node — the smallest real subject in this repo that has
  all three parts a decision needs (a durable node spec, a frozen `.feature`, and a real
  TypeScript implementation with a colocated test file).
- Both directions actually performed on it, against the repo's own checks, on `main` at
  `0e35688`.
- What each direction implies for the two gates, for `cyber-truss`'s hold on settled state,
  and for a reader who is not an engineer.

**Out**

- Any migration. Everything here is `*-next`-shaped evidence; the corpus was restored after
  each trial and nothing shipped moved.
- Corpus-wide implementation of the winner. This dossier settles direction, not rollout.

## Method

1. **Reason it through** — work the issue's open questions against the mechanics the repo
   actually has (freeze, the verdict unit, the default read path), not against the mechanics
   the issue assumes.
2. **Trial A** — perform the colocation on `place-node` on a scratch branch and run the repo's
   own checks, measuring against a recorded baseline of the same commands.
3. **Trial B** — build a real externalized store (`node:sqlite`, no deps, matching the repo's
   `.mts` convention), ingest the whole corpus, and measure the second brain's answers against
   the two access paths agents have today.

The trial artifacts are in [`trial-a/`](./trial-a/) and [`trial-b/`](./trial-b/); the raw
numbers are in [`evidence.md`](./evidence.md).
