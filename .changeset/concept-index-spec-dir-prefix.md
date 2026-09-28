---
"cyber-sdd": patch
---

`concept-index` keeps whole node paths when `--spec-dir` is `.`, starts with `./`, or ends with `/`. Before, it cut characters off the front of each path, so `cli/` showed as `i/`.
