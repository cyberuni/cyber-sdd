---
spec-type: reference
concept: lifecycle
---

# gate-validation — the gate-legality bar

A **reference artifact**: the `gate-validation` governance — what makes a spec's state *legal*, and
how a gate records its verdict. A fixed-universal SDD governance loaded by validate-spec, the
conductor, and the spec-judge; invariant per role (not face-split).

## Subject

- **Artifact** — the `gate-validation` governance, shipped as
  `plugins/sdd-new/skills/gate-validation-governance/` (a fixed-universal SDD governance —
  `../../design/governance-resolution.md`).
- **Contract surface** — the legal `(status, aligned, markers, .feature, approval)` tuples, the
  per-node `spec-type` checks, `aligned` layer-scoping at each gate, approval attribution, the
  no-resolvable-producer fail-closed rule, and the **freeze-protects-content-not-path** rule (a pure
  rename of a frozen `.feature` is not a gate-able edit — `../../design/lifecycle-model.md`).
- **Conformance** — verified through `../../authoring/validate-spec/` (and the mechanical
  `check-spec-state.mts`, the source of truth), never by this artifact itself. A reference artifact
  carries this `## Subject` in place of `## Use Cases` + a `.feature`.
- **Boundary** — the **model folds into `../../design/lifecycle-model.md`** (the legal-state tuples,
  the two gates, `aligned` scoping, and gate accountability already live there — there is no
  separate `design/gate-validation.md`); the `status` schema/transitions are `lifecycle`;
  write-ownership is `ownership`. **This bar carries no leash** — the self-clear-vs-escalate leash
  lives in `../../design/autonomy-rubric.md` (a hard floor + a three-dimension gradient). This bar
  owns gate **legality**, not gate **autonomy**.
