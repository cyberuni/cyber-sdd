# setup — prepare the local ACED environment

> Descriptive index. Onboarding capabilities that ready a repo to run ACED — distinct from
> **registering** ACED as the SDD plugin (`../registry/`), which is a separate concern.

## Capability map

| Node | Type | What |
|---|---|---|
| [`ignore-run-output/`](./ignore-run-output/README.md) | behavioral (`node:test`) | keep ACED run output out of version control — ensure the results directory is git-ignored |

The `init-aced` skill orchestrates these onboarding steps; each capability is specified as its own
node with its own dedicated implementation seam (ADR-0030).
