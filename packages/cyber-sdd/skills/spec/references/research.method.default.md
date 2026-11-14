---
description: How the spec skill researches a capability's idea, feasibility, and prior art before its use cases settle, and the artifact the research leaves.
tags: [spec, research]
---

# Research method

Research the drafted intent of a capability before its use cases and criteria settle. The input is the spec's
outcome, What, and actors and goals as drafted. The output is one durable artifact and its link.

## Run

Load `research-workbench:deep-research` and run it on the drafted intent, asking it to cover:

1. **Idea.** Whether the problem is real and stated correctly: who else has it, and how they describe it.
2. **Feasibility.** Platform limits, costs, quotas, and the APIs that exist or do not. Each claim cites its source;
   mark every claim not verified.
3. **Prior art.** Existing solutions, each with its pros and cons against the drafted intent, ending in a
   recommendation to adopt, extend, or build, with the reason.

When `research-workbench:deep-research` is not installed, run the same three parts with the search and fetch tools
the session has, and say in the artifact that the deep-research skill was not used.

## Leave

Save the result where it stays: a research topic folder in the repository when it has one (such as
`.research/<topic>/`), else a comment with its sources on the issue the spec was asked for. The artifact ends with a
list of each change the research made to the drafted intent, or says there was none.

Return the artifact's link, the recommendation, the feasibility limits that constrain behavior, and the intent
changes it proposes.
