# improve-skill

Audit and improve a `SKILL.md` for structure, quality, security, and supply-chain signals, then apply fixes.

## When to use

Use this skill before trusting or shipping a skill.

Good triggers include:

- Before installing a third-party skill
- Before committing a new or modified skill
- When reviewing a skill for publication on skills.sh
- When improving an existing skill's quality or security posture

## What it does

The skill runs a full rubric covering:

- Structure and frontmatter (S1–S5)
- Content quality aligned with skill-design governance (Q1–Q13)
- Security and supply-chain checks (E1–E9, P1–P3)

After reporting findings, it applies fixes directly to the SKILL.md.

Mechanical checks can run without an LLM:

```bash
npx cyberplace@<version> audit validate --path skills/my-skill
```

Full quality review and fix application require this agent skill after mechanical validation passes.

## Install

```bash
npx skills add cyberuni/cyberplace --skill aced/improve-skill
```
