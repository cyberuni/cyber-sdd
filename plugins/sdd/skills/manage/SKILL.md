---
name: manage
description: Use this skill when doing manage-level (non-mission) SDD work on the spec corpus — bootstrap, inspect, audit, or housekeeping — such as "set up the project spec", "backfill the spec", "list the SDD specs and statuses", "audit the corpus structure", "check for spec/suite drift", or "retire completed mission plans". Routes to the matching engine; it does not change what the project specifies (that is start-mission).
---

# manage

The **manage-level** front door to an SDD project — the user-facing handler for the gateway's **"Manage the corpus"** route, sibling to `start-mission`. Where `start-mission` **changes what the project specifies** (opens a CR, runs the mission loop), `manage` does **non-mission** work on the corpus: **bootstrap**, **inspect**, **audit**, **housekeeping**.

`manage` is a **thin dispatcher**: it classifies a manage request and **loads the matching engine in the current session**, holding **no production logic**, loading **no governance**, and writing **no contract state**. It **opens no CR**, **invokes no gate**, and **performs no behavior change** itself — a needed change to the project's specified behavior is **handed off to `start-mission`**.

> **Manage picks no model.** Like the gateway, the model + effort a piece of work needs is set by the **engine you load** — the `.mts` engines are light; a `backfill` or `formation` grill wants a capable model. The loaded engine advises; the user switches manually. (Harness gap: `manage` cannot switch the session model itself.)

## Intake

- **Fast path — skip the menu.** When the invocation already **names the operation** — "backfill the project spec", "list the specs", "check spec structure", "retire the finished plans" — load the matching engine directly, no menu.
- **Two-level menu — bare invocation.** When `manage` is invoked with **no operation named**, do not guess. Conduct intake as a **two-level menu**, never a flat list. **Never ask more than four options** in a single `AskUserQuestion` (the tool rejects more than four). The top-level question presents the **four operation groups**; the second level picks the specific engine.

| # | Operation group | Covers |
|---|---|---|
| 1 | **Setup & discovery** | scaffold a project's spec envelope for the first time → `backfill-project-spec`; curate discovery's extra spec anchors → `manage-spec-anchors`; curate the ignore file → `manage-ignore`; set up or configure the mission statusline → `init` (all are prerequisites for a project being found and usable, not routine cleanup) |
| 2 | **Inspect** | list / navigate the corpus → `discover-specs`, `concept-index`, `place-node`, `discover-plans` |
| 3 | **Audit & align** | audit node-shape, drift, structure → `check-spec-structure`, `formation-loop`, `align-spec` *(planned)*; scan plan briefs for machine-local path leaks → `check-plan-safety` |
| 4 | **Housekeeping** | retire completed mission plans → `plan-retirement` |

When a group's engine list would exceed four at the second level, present only the most-relevant few (≤ 4) or ask the user to name the engine directly; never enumerate into an over-four question and never truncate silently.

## The routing table — group → engine

Classification routes a manage request to the **engine** that handles it; every engine already exists (all `user-invocable: false`, loaded here).

| Group | Request | Engine (handler) |
|---|---|---|
| **Setup & discovery** | set up / backfill a project's spec for the first time | **`backfill-project-spec`** — scaffolds the spec envelope + stub nodes |
| **Setup & discovery** | list / change discovery's extra spec anchors | **`manage-spec-anchors`** — list fixed + custom anchors, CRUD the custom ones, induce a pattern from a path, preview its match (writes only `.agents/sdd/spec-anchors.toml`) |
| **Setup & discovery** | curate the ignore file | **`manage-ignore`** — curate `.agents/sdd/.sddignore` (list / add / remove / induce / preview); writes only the ignore file |
| **Setup & discovery** | set up / configure the mission statusline | **`init`** — user-invocable onboarding skill; offers the opt-in statusline, wires the reader into project `.claude/settings.json` |
| **Inspect** | list the specs + statuses | **`discover-specs`** — frontmatter-only corpus scan |
| **Inspect** | render / refresh the by-concept view | **`concept-index`** — `--check` (read) / `--write` (refresh block) |
| **Inspect** | where does a new concept belong | **`place-node`** — provisional home + duplicate catch |
| **Inspect** | list in-progress (resumable) missions | **`discover-plans`** — plan-brief scan |
| **Audit & align** | audit node-shape (orphans / oversized) | **`check-spec-structure`** — read-only advisory |
| **Audit & align** | scan plan briefs for machine-local path leaks | **`check-plan-safety`** — read-only guard; flags home-abs paths + `$HOME`/`$USER` in `.agents/plans` |
| **Audit & align** | reconcile prose↔suite drift | **`align-spec`** *(planned — spec-only, no engine yet)* — a fix that edits behavior **hands off to `start-mission`** |
| **Audit & align** | corpus-wide audit / split / reconcile | **`formation-loop`** — emits new CRs (→ `start-mission`) |
| **Housekeeping** | retire completed mission plans | **`plan-retirement`** — gated, idempotent deletion of retired briefs |

Reviewing **pending strategy** is **not** a manage operation — it stays **gateway-owned** (the gateway's episodic pending-count, its option 3). `manage` does not surface or ratify strategy.

## Load the engine in-session

When the route resolves, **load the matched engine in the current session** and run it directly — **spawn nothing**. Read-only engines (`discover-specs`, `discover-plans`, `check-spec-structure`, `check-plan-safety`, `place-node`, `concept-index --check`) run in place; **write-capable** operations stay **owned by their engine** — `backfill-project-spec` scaffolds the skeleton, `plan-retirement` performs its gated deletion, `concept-index --write` refreshes the generated block, `manage-spec-anchors` writes its `spec-anchors.toml` config. `manage` only routes.

## Non-mission — the boundary

`manage` maintains and inspects the corpus; it **never changes what the project specifies**.

- **Opens no CR, invokes no gate, writes no `status` / `approval`.** Those belong to `start-mission` and the internal gates.
- **Hand off a behavior change.** When an operation surfaces a needed change to the project's specified behavior — a `formation` reconcile, an `align-spec` drift whose fix edits the spec/suite — **hand off to `start-mission`**, which opens a CR and runs the mission loop. Do not edit the spec/suite here.
- **A change request is not a manage operation.** A request to **add or revise** the project's specified behavior is **redirected to `start-mission`**, not handled as a manage operation.
- **Thin classifier.** Classifying loads **no governance** and holds **no production logic** — it only loads the matched engine.
