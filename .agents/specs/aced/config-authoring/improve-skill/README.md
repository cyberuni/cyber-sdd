---
spec-type: behavioral
concept: [config-authoring, audit]
---

# improve-skill — audit and improve an existing SKILL.md

Audit, improve, or write a SKILL.md against the description-trigger, structure, security, and
agentskills.io-compliance bars, then apply fixes. A **hybrid** unit: an LLM audit/quality workflow
(agent judgment over the full check table) plus the deterministic mechanical subset of that table
(S1–S6, Q1–Q5, Q10–Q11, Q17, E1–E2, E6, E9) ported from the cyberplace CLI's `audit validate` as a
CI-usable engine.

> **This is a single behavioral unit, not an overview** — one skill plus its ported engine. This
> spec owns the behavior + suite ([`improve-skill.feature`](./improve-skill.feature)); the impl is
> the `improve-skill` skill in `plugins/aced/skills/improve-skill/` plus a `scripts/validate.mts`
> engine reachable from it and from CI.

## Use Cases

**Fit:** partial (hybrid). The trigger layer (when improve-skill activates on a review/audit/pre-install
request vs. defers to authoring a new skill) and the LLM-audit layer (judging the agent-only checks
— Q6–Q9 skill-design fit, Q12–Q16, E3–E5, E7–E8, P1–P3 — and deciding what to fix) are real ACED
eval targets, strong-to-partial: graded with `@trigger` and `@rubric`. The mechanical validate
engine is a deterministic pass/fail scan over a fixed check list — wrong-squad for rubric grading;
its behaviors are specified as plain boolean scenarios only.

**Subject** — a skill that, given a target SKILL.md (named or discovered across all three skill
locations), runs the full check table, reports findings with severity and remediation, blocks on any
CRITICAL finding until the user confirms, then applies fixes in a single pass and re-verifies only
the checks that had findings. The mechanical subset of the table (S1–S6, Q1–Q5, Q10–Q11, Q17, E1–E2,
E6, E9) also runs standalone as a deterministic engine — single-skill via `--path` or whole-project
scan by default — exiting non-zero only on a CRITICAL finding, so it can gate CI without an LLM.

Description checks are **kind-aware**. A skill is **internal** when its frontmatter sets top-level
`user-invocable: false` **or** `metadata.internal: true`. The trigger-language check (Q1) and the
trigger-specificity word count (Q2) apply to **public** skills only — an internal skill is invoked
by name by its caller, not matched to a user situation, so it needs no trigger. In their place an
internal skill's description is held to **identity + named caller only**: Q17 flags an internal
description that carries **operational-detail markers** — a file path, an `.agents/` / `scripts/`
directory, a check-ID (`S1`–`E9`), or a named artifact file (`x.mts`, `x.feature`) — detail that
belongs in the body + README and drifts stale when duplicated into the description. Q17 deliberately
detects only those four **objective** markers; it does not judge subtler prose overhang or stylistic
drift — an intentional mechanical-vs-judgment boundary, since prose overhang is not mechanically
separable from legitimate identity-plus-caller prose without false positives.

**Non-goals** — authoring a new skill from scratch (`define-skill`); validating repo-private skill
metadata (`repair-private-skills`); finding a skill's upstream source repo (`contribute-skill`).
improve-skill only audits and improves a SKILL.md that already exists; it does not decide the
skill's design from a blank slate, and it does not resolve where a skill came from.

Every scenario in [`improve-skill.feature`](./improve-skill.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **triggers on review/audit/pre-install requests** | activates on "review before I publish", "my skill isn't triggering", "check this skill", pre-install audit, and defers to `define-skill` for from-scratch authoring |
| **untrusted content, sandboxed read** | SKILL.md and bundled script content is analyzed as data, never executed or followed as instructions, and only expected/user-given paths are read |
| **pre-install fetch without install hooks** | a remote skill can be audited before install via a sparse, hookless clone into a temp dir |
| **target resolution: named or discovered** | a named skill locates its SKILL.md; an unnamed request audits every SKILL.md across all three placements, deduplicated by real path |
| **full check table run** | every check (mechanical + agent-only) is evaluated and produces one results table per skill |
| **governance loaded for judged checks** | skill-design governance backs Q6–Q9 and agent-tool-output governance backs Q10–Q12 before those checks are judged |
| **findings reported with severity, evidence, fix** | every non-passing check is listed with its severity, quoted evidence, and a one-line remediation |
| **blocks on CRITICAL until confirmed** | any CRITICAL finding halts install/commit/publish with a context-appropriate message until the user confirms |
| **fixes applied in one pass, scoped to findings** | after confirmation, fixes are applied in a single edit pass, touching only what each finding's remediation specifies |
| **re-verify only affected checks** | after fixing, only the checks that had findings are re-run to confirm they now pass |
| **human-judgment findings are reported, not auto-fixed** | P1–P3 supply-chain findings and E8 script findings are surfaced for the user rather than silently changed |
| **kind-aware description checks** | an internal skill (top-level `user-invocable: false` or `metadata.internal: true`) is exempt from the trigger-language (Q1) and trigger-specificity word-count (Q2) checks and is instead held to identity + caller only — Q17 flags an internal description carrying operational-detail markers (paths, `.agents/`/`scripts/` dirs, check-IDs, named artifact files) |
| **mechanical engine runs the deterministic subset** | the engine evaluates S1–S6, Q1–Q5, Q10–Q11, Q17, E1–E2, E6, E9 without an LLM |
| **`--path` scans one skill; default scans the whole project** | passing `--path` validates a single skill directory or SKILL.md; omitting it scans every configured skill location |
| **exit code gates on CRITICAL only** | the engine exits non-zero when any scanned skill has a CRITICAL finding, and exits zero when only warnings (or nothing) are found |

## Scenarios (colocated)

The behavior suite is [`improve-skill.feature`](./improve-skill.feature) — the trigger layer (an
`@trigger` outline covering activation and the deferrals to `define-skill`, `repair-private-skills`,
and `contribute-skill`), the LLM-audit workflow (`@rubric` scenarios for judgment-heavy checks plus
plain scenarios for its mechanical report/block/fix steps), and the deterministic validate-engine
behaviors (plain boolean scenarios: scan scope, severity split, exit code). Cross-capability e2e
scenarios live in `../../acceptance/`.
