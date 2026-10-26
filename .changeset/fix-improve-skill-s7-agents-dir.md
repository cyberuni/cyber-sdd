---
"cyber-aced": patch
---

`improve-skill` S7 no longer warns on a skill-local `agents/` directory that holds host-interface YAML such as `agents/openai.yaml`, which OpenAI's skill layout documents. Any other entry in `agents/`, such as a subagent definition or a subdirectory, still warns.
