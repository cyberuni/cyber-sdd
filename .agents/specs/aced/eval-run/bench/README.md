# bench/ — the measured layer

ACED's other layers judge a configuration by **blind simulation**: a judge reads the config and a
scenario and grades what an agent *would* do. The measured layer runs the agent **for real** — a
headless harness session per run, in a throwaway checkout — and grades the outcome with a
deterministic shell `check`. It records what the harness itself counts (pass, tokens, turns, tool
calls, cost, wall time) and compares two arms with permutation statistics, so a real change can be
told apart from noise.

It came from repobuddy's `agent-readiness bench`, generalized from "a whole repo at a commit" to
three subject kinds (a git ref, a package version, a single swapped file). `agent-readiness` is now a
consumer: it supplies a task set and reads the comparison records.

| Node | Type | What |
|---|---|---|
| [`engine/`](./engine/README.md) | behavioral | the deterministic engine — `plan`, `run`, `compare`, `init` — shipped as `.mts` scripts with a published bin, verified by `node:test`. Fit **wrong-squad**: ACED recuses, the SDD-default chain builds and judges it. |
| [`skill/`](./skill/README.md) | behavioral | the `bench` skill that wraps the engine for a person — plan first, spend only on an explicit yes, report what the numbers can and cannot say. Fit **partial**: ACED grades it. |

Whether a subject is worth measuring at all is the `measured` axis of fit
([`../../design/fit.md`](../../design/fit.md)), declared in the subject node's `eval.md` under `bench:`.

**Not here** — `compare`'s measured mode and `report`'s measured section belong to those nodes
([`../compare/`](../compare/README.md), [`../report/`](../report/README.md)) and arrive as their own
additive changes. Fanning a measured run out over several models is a separate change.
