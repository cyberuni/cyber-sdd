# manage

The manage-level front door to ACED — a thin dispatcher for **non-mission** work on the agent-config
tooling ACED evaluates.

## When to use

Use this skill for work that is neither authoring a config nor scoring one:

- Set up the per-model **runner agents** used to benchmark skills
- **List** the current model runners
- **Remove** a model runner

Good triggers: "set up the model runners", "list the runners", "remove the haiku runner". If you
instead want to *create* an agent or skill, use `define-agent` / `define-skill`; to *score* a config,
use `run`; to *change what ACED specifies*, use `start-mission`.

## What it does

`manage` classifies the request and **loads the matching engine in the current session** — it spawns
nothing, opens no change request, invokes no gate, and writes no contract state. When the operation
is named it takes the fast path; on a bare invocation it asks a menu of at most four options.

Today it routes one group:

| Group | Engine |
|---|---|
| **Config runners** — set up / list / remove per-model runner agents | `manage-model-runners` (internal) |

The table grows as more manage-level ACED engines land.

## Boundaries

`manage` never changes what ACED specifies. Authoring redirects to `define-agent` / `define-skill`,
scoring to the eval-run skills, and a change to ACED's own behavior to `start-mission`.
