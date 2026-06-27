# forge/ — the field outer loop (SDD self-improvement)

The **Forge loop** — the step-5 outer loop that improves **SDD itself** from real field
usage. It is the **external** outer loop: where campaign/formation/doctrine retrospect on a
project's *own* provenance (internal), forge reaches *outside the installation* and asks the
**end-users of an installation** to **opt in and share field corrections**, so the shared SDD
contract grows from real corrections rather than invented ones. Owned by the **maintainers**.

There is **no `harness/` folder**: a project's engineering harness (toolchain, CI,
distribution) is the project's own concern, outside SDD, and has **no dedicated loop**. Forge
does not evolve it.

## Internal vs external — what makes forge different

| Loop(s) | Source | Improves |
|---|---|---|
| campaign / formation / doctrine | the project's own provenance — combat log, ledger, public trail (**internal**) | the project |
| **forge** | **end-user corrections across installations (external, opt-in)** | **SDD itself** |

Because forge moves data *out of an installation*, it carries the **Consent** hard floor (one
of the three C's; see `../design/autonomy-rubric.md`).

## Output — emits new CRs

Findings re-enter the system as **new CRs** through the single intake (`../intake/README.md`);
the loop never auto-applies anything. The trigger is retrospective: a recurring correction
pattern in the field. The maintainers' **Council** holds keep-or-cut; nothing becomes work
without a ratified CR.

## The cross-installation field unit

The unit fed upstream is the **distilled `correction`-with-`cause`** recurrence — carried in the
ledger's `strategy` evidence (`../design/provenance-model.md`), not the raw combat-log line,
which is committed but transient (deleted from the tree at retro). This folder consumes that
shape, it does not redefine it. Because corrections can carry code, prompts, paths, and secrets, **opt-in,
redaction, visibility, and human review are load-bearing, not bolted-on**:

| Stage | Requirement |
|---|---|
| **Consent** | explicit opt-in; **default OFF**; revocable. With opt-in OFF the loop captures nothing and sends nothing — fully inert. |
| **Minimize** | capture only the correction-with-cause record needed upstream — not surrounding context, not the whole transcript. |
| **Redact / anonymize** | strip or mask sensitive content (secrets, paths, identifying data) before anything can be transmitted. |
| **Preview** | the user reviews **exactly what would be sent** before it leaves — no opaque payload. |
| **Maintainer review** | a submission enters the shared corpus **only** after a human maintainer reviews it. |

**Hard invariant:** sensitive data is never transmitted unredacted; a record that has not
passed redaction is never eligible to leave the environment.

## Optional and downstream — never blocking

The field loop is **entirely optional**. SDD's core workflow — intake, explore, deliver,
handoff, and the other outer loops — runs **identically whether the field loop is present,
absent, or opted out**. It is **never a dependency** of any core step — built
after the core loops are solid, costing nothing operationally in its absence.

## Boundaries — Forge owns the field channel only

A product decision → `../campaign/`; a corpus-structure observation → `../formation/`; a
process lesson → `../doctrine/`. Forge owns only the **opt-in, cross-installation channel**
that improves SDD from real field corrections — nothing about a project's own harness.

## Scenarios

Unit scenarios (consent OFF ⇒ nothing captured; no unredacted transmit; core workflow
unaffected) colocate in this folder; cross-capability outcome scenarios live in `../acceptance/`.
