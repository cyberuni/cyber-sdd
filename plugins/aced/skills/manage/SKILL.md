---
name: manage
description: Use this skill when doing manage-level (non-mission) ACED work — inspecting or maintaining the agent-config tooling ACED evaluates, such as "set up the per-model runner agents", "list the model runners", or "remove a model runner". Routes to the matching engine; it does not author a config (define-agent / define-skill) or change what ACED specifies (start-mission).
---

# manage

The **manage-level** front door to ACED — the user-facing handler for **non-mission** work on the
agent-config tooling corpus. Where `define-agent` / `define-skill` **author** a config and `run` /
`add-scenario` **score** one, `manage` does the work that is neither: **inspect and maintain** the
tooling ACED evaluates.

`manage` is a **thin dispatcher**: it classifies a manage request and **loads the matching engine in
the current session**, holding **no production logic**, loading **no governance**, and writing **no
contract state**. It **opens no CR**, **invokes no gate**, and **performs no behavior change** itself.

> **Manage picks no model.** The model + effort a piece of work needs is set by the **engine you
> load**. The loaded engine advises; the user switches manually. (`manage` cannot switch the session
> model itself.)

## Intake

- **Fast path — skip the menu.** When the invocation already **names the operation** — "set up the
  model runners", "list the runners", "remove the haiku runner" — load the matching engine directly,
  no menu.
- **Menu — bare invocation.** When `manage` is invoked with **no operation named**, do not guess. Ask
  via `AskUserQuestion`, presenting **at most four options** (the tool rejects more than four) and
  never truncating silently. Today there is one route group (**Config runners**); as more manage-level
  engines land, group the menu so a bare invocation still resolves within the four-option rule.

## The routing table — request → engine

Classification routes a manage request to the **engine** that handles it. The table grows as more
manage-level ACED engines land; today it carries one route:

| Group | Request | Engine (handler) |
|---|---|---|
| **Config runners** | set up / list / remove per-model runner agents used to benchmark skills | **`manage-model-runners`** — internal, non-invokable; loaded here |

## Load the engine in-session

When the route resolves, **load the matched engine in the current session** and run it directly —
**spawn nothing**. Write-capable operations stay **owned by their engine**: `manage-model-runners`
writes its runner agent-def files and their symlinks. `manage` only routes.

## Non-mission — the boundary

`manage` maintains and inspects the ACED tooling corpus; it **never changes what ACED specifies**.

- **Opens no CR, invokes no gate, writes no `status` / `approval`.** Those belong to `start-mission`
  and the internal gates.
- **Authoring is not manage.** A request to **create or improve** an agent definition or a workflow
  skill is redirected to **`define-agent`** / **`define-skill`**, not handled here.
- **Scoring is not manage.** A request to **run or score** a config's eval suite defers to the
  **eval-run** skills (`run` / `compare` / `report`).
- **A change to what ACED specifies** — adding or revising ACED's own behavior — is redirected to
  **`start-mission`**, which opens a CR and runs the mission loop.
- **Thin classifier.** Classifying loads **no governance** and holds **no production logic** — it
  only loads the matched engine.
