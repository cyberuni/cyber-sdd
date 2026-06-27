---
name: impl-producer-governance
description: "Internal skill: the SDD default impl-producer procedure — how to build the implementation AND its verification (one per frozen scenario) against the frozen .feature for a domain no plugin covers. Loaded in-session by sdd-operator when it runs the impl-producer role inline (produced-by sdd:sdd-operator); not triggered by users directly."
user-invocable: false
---

# Impl-Producer Governance — the default build procedure

The procedure the **Operator** follows when it runs the **impl-producer** role from the SDD default — no plugin covers the domain and no model-tuned producer agent is named, so the Operator **loads this governance and builds inline** in its own warm context (recorded `produced-by.impl-producer: sdd:sdd-operator`). This is the SDD-default builder made explicit as a loadable procedure — what the retired "generic Builder (no agent)" / fabricated `sdd:builder` was always groping for. There is no spawned default impl-producer agent.

Load alongside this governance: the resolved **builder** + **architect** actor bars — to self-align **and** to author the verification — and `sdd:ownership-governance` for the write-ownership matrix. The grader is separate: a **cold impl-judge** (`sdd:sdd-implementer` or the plugin's judge) runs the verification this role authored; this governance never declares its own pass verdict.

## Inputs (folded in by the Operator)

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, PLAN_PATH, TASKS_PATH
MODE: explore | implement
```

## Procedure

1. **Read the frozen contract.** Read the `.feature`. In `implement` (deliver) mode it is **frozen** — the sealed orders; build against it as the fixed bar. In `explore` mode it is a **draft** — spike against it; a discovery (the chosen solution needs a behavior the `.feature` omits) returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`. The ship-quality impl-judge does not run during explore.

2. **Build the implementation** against the frozen `.feature`, applying the **builder** + **architect** bars (testability/coverage; structural fit — no duplication or conflict). The product/test split is a private detail — it is not surfaced.

3. **Author the verification** — one functional test/eval per frozen scenario, anchored to the frozen scenarios, **not** free-authored from your own sense of done. Any rubric/threshold/score is a validation detail — it never appears in the `.feature`. The impl-judge **runs** this verification; this role does not run it as the gate.

4. **Never modify `spec.md` or the `.feature`** — four-eyes (the builder does not set its own bar). A behavior-changing gap is a `CONTENT_GAP` / `BLOCKER`, never an in-place edit.

## Output (the Operator collects)

```
STATUS:              complete | needs-input | blocked
ARTIFACTS_WRITTEN:   [ paths ]
VERIFICATION_WRITTEN: [ paths ]   # one per frozen scenario
CHANGES_MADE:        <what was built>
QUESTIONS:           [ batched, when needs-input ]
CONTENT_GAPS:        [ { artifact, location, gap } ]
OBSERVATIONS:        [ { owner: architect | strategist, note, evidence } ]
```
