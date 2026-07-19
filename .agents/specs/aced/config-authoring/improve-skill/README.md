---
spec-type: behavioral
concept: [config-authoring, audit]
---

# improve-skill — audit and improve an existing SKILL.md

Audit, improve, or write a SKILL.md against the description-trigger, structure, security, and
agentskills.io-compliance bars, then apply fixes. A **hybrid** unit: an LLM audit/quality workflow
(agent judgment over the full check table) plus the deterministic mechanical subset of that table
(S1–S6, Q1–Q5, Q10–Q11, Q17, Q18, E1–E2, E6, E9) ported from the cyberplace CLI's `audit validate`
as a CI-usable engine.

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
the checks that had findings. The mechanical subset of the table (S1–S6, Q1–Q5, Q10–Q11, Q17, Q18,
E1–E2, E6, E9) also runs standalone as a deterministic engine — single-skill via `--path` or
whole-project scan by default — exiting non-zero only on a CRITICAL finding, so it can gate CI
without an LLM.

Description checks are **kind-aware**. A skill is a **partial skill** when its frontmatter sets
top-level `user-invocable: false` — a real SKILL.md that is a **decomposed, reusable part of a larger
capability**: the orchestrator loads or invokes it **by name** (via the plugin registry +
`artifact-type` query), never matched to a user situation and never offered as a `/` command. This is
a category Claude Code models with no single field: a partial skill is `user-invocable: false` (not
user-listed), usually `metadata.internal: true` (not marketplace-discoverable — a *distinct*
"project-local internal" concern, orthogonal to being a partial), and must stay
`disable-model-invocation: false` (default) so the orchestrator can still invoke it by name.
**`metadata.internal: true` alone does not make a skill partial** — it is a marketplace-visibility
flag, so a marketplace-hidden but user-facing skill stays public.

Because a partial skill stays `disable-model-invocation: false`, the harness still holds its
`description` in context and *could* spuriously auto-match it. So the description is held to
**identity for the caller, kept minimal and non-trigger-shaped**:

- **Q1 / Q2 are public-only** — a partial skill needs no `"Use this skill when"` trigger, and its
  specificity word-count is not judged.
- **Q18 flags trigger language** — a partial skill whose description carries `"Use this skill when"` /
  `"when to use"` phrasing is flagged, because trigger-shaped text on a by-name part invites the
  spurious harness matching we are trying to avoid.
- **Q3 requires the `"Partial Skill:"` prefix** — the explicit self-declaration of the category (the
  recommended full form is `"Partial Skill: invoke by name only — <identity>. <caller>."`); a partial
  description not leading with it is flagged.
- **Q17 flags operational-detail markers** — a file path, an `.agents/` / `scripts/` directory, a
  check-ID (`S1`–`E9`), or a named artifact file (`x.mts`, `x.feature`) — detail that belongs in the
  body + README and drifts stale when duplicated into the description. Q17 deliberately detects only
  those four **objective** markers; it does not judge subtler prose overhang — an intentional
  mechanical-vs-judgment boundary, since prose overhang is not mechanically separable from legitimate
  identity-plus-caller prose without false positives.

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
| **kind-aware description checks** | a partial skill (a by-name-invoked part of a larger capability, classified by top-level `user-invocable: false`; `metadata.internal: true` alone does not classify) is exempt from the trigger-language (Q1) and specificity word-count (Q2) checks and instead held to identity for the caller — Q18 flags trigger language, Q3 requires the `"Partial Skill:"` prefix, and Q17 flags operational-detail markers (paths, `.agents/`/`scripts/` dirs, check-IDs, named artifact files) |
| **mechanical engine runs the deterministic subset** | the engine evaluates S1–S6, Q1–Q5, Q10–Q11, Q17, Q18, E1–E2, E6, E9 without an LLM |
| **`--path` scans one skill; default scans the whole project** | passing `--path` validates a single skill directory or SKILL.md; omitting it scans every configured skill location |
| **configurable scan locations** | on top of the two built-in defaults (`skills/`, `.agents/skills/`), an opt-in `.agents/aced/skill-dirs.toml` `anchors` array adds extra scan locations (glob `*` one segment, `**` any depth); a repeatable `--dir <glob>` flag adds one-off locations; an absent config leaves behavior unchanged; skills reached through more than one location dedupe by real path (curated via `manage-skill-dirs`) |
| **S1 keys on the scan root, not a dirname** | S1 requires a SKILL.md to sit in its own named subdirectory directly under a recognized scan root (the defaults plus any configured location), not a directory literally named `skills` — a skill under a configured non-`skills` location passes, while a SKILL.md sitting directly at a scan root still fails S1 |
| **exit code gates on CRITICAL only** | the engine exits non-zero when any scanned skill has a CRITICAL finding, and exits zero when only warnings (or nothing) are found |
| **E1 severity graded by blast radius** | a catastrophic destructive command (`rm -rf`/recursive `rm`, `sudo rm`, `curl`/`wget` piped to a shell, `dd`, `mkfs`, fork bomb, or `rm -f` targeting a glob/absolute/home path) is CRITICAL and blocks; a scoped `rm -f <single named relative file>` is a WARN — surfaced, never blocking, with no per-skill ratify/allowlist bypass |

## Scenarios (colocated)

The behavior suite is [`improve-skill.feature`](./improve-skill.feature) — the trigger layer (an
`@trigger` outline covering activation and the deferrals to `define-skill`, `repair-private-skills`,
and `contribute-skill`), the LLM-audit workflow (`@rubric` scenarios for judgment-heavy checks plus
plain scenarios for its mechanical report/block/fix steps), and the deterministic validate-engine
behaviors (plain boolean scenarios: scan scope, severity split, exit code). Cross-capability e2e
scenarios live in `../../workflows/`.
