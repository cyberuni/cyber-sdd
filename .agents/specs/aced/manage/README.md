---
spec-type: behavioral
concept: routing
---

# manage — the ACED manage-level dispatcher

The manage-level front door to ACED: `manage` is the user-facing handler for **non-mission** work on
the agent-config corpus — inspecting and maintaining the tooling ACED evaluates — as opposed to
authoring or scoring a config (`define-*` / `run` / `add-scenario`). Modeled on the SDD `manage`
dispatcher, it is a **thin dispatcher**: it classifies a manage request and **loads the matching
engine in the current session**, holding no production logic, loading no governance, and writing no
contract state.

> **This is a single behavioral unit, not an overview** — `manage` is one skill. This spec owns the
> behavior + suite ([`manage.feature`](./manage.feature)); the impl is the thin-dispatcher `manage`
> skill in `plugins/aced/skills/manage/`.

## Use Cases

**Fit:** strong — `manage` makes a genuine activation decision (a manage-level operation vs. the same
tooling vocabulary carried by `define-agent` / `define-skill` when the intent is to *author*, or by
`start-mission` when the intent is to *change what ACED specifies*) and its classification is
non-deterministic judgment, so the agent-behavior eval layers carry signal.

**Subject** — the ACED manage dispatcher: classify a **manage-level** request and **load the matching
engine in the current session** so the session runs it directly — a thin dispatcher holding no
production logic.

**Non-goals** — it holds **no** production logic, loads no governance, and performs no operation
itself beyond loading the matched engine; it **opens no CR** and **invokes no gate**; a request to
**author** a config (an agent, a skill) or to **change what ACED specifies** is **not** a manage
operation — it is redirected to `define-agent` / `define-skill` / `start-mission`.

Every scenario in [`manage.feature`](./manage.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **fast path** | a request naming a manage operation loads its engine directly, no menu |
| **menu on bare invocation** | a bare invocation gathers intent via a menu rather than guessing |
| **the four-option rule** | an intake question presents at most four options, never truncating silently |
| **route → model runners** | a request to set up / list / remove per-model runner agents loads the `manage-model-runners` engine |
| **route → list skills** | a request to list / inventory installed skills loads the `list-skills` engine |
| **route → repair private skills** | a request to validate / repair repo-private skill metadata loads the `repair-private-skills` engine |
| **load the engine in-session** | a resolved route loads the matched engine in the **current session** and runs it directly — `manage` spawns nothing |
| **model advice** | `manage` picks no model; it defers the model choice to the loaded engine |
| **non-mission guard** | `manage` opens no change request and invokes no gate |
| **write-ownership guard** | a routed operation writes no `status` / `approval` — `manage` writes no contract state |
| **thin-classifier guard** | classifying loads no governance and holds no production logic, only loading the matched engine |
| **authoring is not manage** | an authoring request is redirected to `define-agent` / `define-skill` rather than handled here |
| **scoring is not manage** | a request to run or score a config's eval suite defers to the eval-run skills rather than handled here |
| **change-spec is not manage** | a change to what ACED specifies is redirected to `start-mission` rather than handled here |

## The routing table — request → engine

Classification routes a manage request to the engine that handles it. The table is structured to grow
as more manage-level ACED engines land (e.g. a project-wide eval-health inspect could later route
here); today it carries one route:

| Group | Request | Engine (handler) |
|---|---|---|
| **Config runners** | set up / list / remove per-model runner agents used to benchmark skills | **`manage-model-runners`** (`../config-authoring/manage-model-runners/`) — internal, non-invokable; loaded here |

## Load the engine in-session

When the route resolves, `manage` **loads the matched engine in the current session** and the session
runs it directly — it **spawns nothing**. Write-capable operations stay **owned by their engine**:
`manage-model-runners` writes its runner agent-def files and their symlinks. `manage` only routes.

**Manage picks no model.** The model + effort a piece of work needs is determined by the **engine
`manage` loads**. The loaded engine advises; the user switches manually.

## Non-mission — the boundary

`manage` maintains and inspects the ACED tooling corpus; it **never changes what ACED specifies**. It
opens no CR, invokes no gate, and writes no `status` / `approval`. A request to **author** a config
or to **add or revise** ACED's specified behavior is **not** a manage operation — it is redirected to
`define-agent` / `define-skill` / `start-mission`, which own that work.

## Scenarios (colocated)

The behavior suite is [`manage.feature`](./manage.feature) — intake (fast path / four-option menu),
the model-runners route, loading the engine in-session, and the boundaries (non-mission,
write-ownership, thin-classifier, authoring redirect). Cross-capability e2e scenarios live in
`../acceptance/`.
