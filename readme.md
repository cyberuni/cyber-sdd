# cyber-sdd

Spec-Driven Development for agents — the SDD process and the two domain plugins that
implement its production-chain roles.

| Plugin  | Package      | What it covers                                                          |
| ------- | ------------ | ----------------------------------------------------------------------- |
| `sdd`   | `cyber-sdd`  | The process: project specs, change requests, the mission loop, both gates |
| `aced`  | `cyber-aced` | Agent configuration: skills, subagents, commands, AGENTS.md sections     |
| `quill` | `cyber-quill`| Documentation: guides, tutorials, references, READMEs                    |

SDD defines the loop — explore, spec gate, deliver, impl gate, handoff. ACED and Quill
plug into it, supplying the spec-producer, spec-judge, impl-producer, and impl-judge for
their own domain.

## Install

```bash
claude plugin marketplace add cyberuni/cyber-sdd
claude plugin install sdd@cyber-sdd
claude plugin install aced@cyber-sdd
claude plugin install quill@cyber-sdd
```

## Documentation

<https://cyberuni.github.io/cyber-sdd/>

## Development

```bash
pnpm install
pnpm verify
```

`verify` runs biome, the turbo build/typecheck/test graph, the skill validators, the spec
corpus checks, and knip.

## License

MIT
