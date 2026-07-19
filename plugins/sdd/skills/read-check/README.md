# read-check

Internal SDD skill — the concrete engine for **read-check** lint checks (presence and parroting) over
a role's read-attestation. Whether a restatement tracks its directive's meaning is judged elsewhere;
this engine only certifies that nothing is missing and nothing is copied.

```bash
node scripts/read-check.mts --attestation attestation.json --skills-dir plugins/sdd/skills
```

Read-only; writes nothing. See [`SKILL.md`](./SKILL.md) for the full contract. Not user-invocable.
