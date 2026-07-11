# Evidence log — Gherkin for UI-based testing

## E1
- date: 2026-07-11
- status: active
- confidence: high
- claim: Declarative Gherkin (describing what the system does, not how the user clicks through the UI) is resilient to UI change; imperative Gherkin tied to UI mechanics requires constant rework.
- source label: Writing better Gherkin
- source URL: https://cucumber.io/docs/bdd/better-gherkin/
- source type: official docs (Cucumber)
- notes: Primary/canonical source; directly from the tool's own maintainers.

## E2
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Common Gherkin anti-patterns: writing scenarios after code, leaking CSS selectors into Given steps, stuffing multiple behaviors into one scenario; result is bloated unread feature files and tests that fail every sprint.
- source label: Gherkin Software Testing: Syntax, Best Practices, and Pitfalls
- source URL: https://testquality.com/cucumber-and-gherkin-language-best-practices/
- source type: vendor blog (TestQuality)
- notes: Vendor-adjacent but consistent with E1/E6; treat as corroborating, not primary.

## E3
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Attempting to document/verify an entire system via Cucumber end-to-end ("the cucumber test trap") produces slow, brittle suites (potentially thousands of scenarios) and removes the design pressure of unit-level TDD; fix is scope discipline, not abandoning Gherkin.
- source label: The Cucumber Test Trap
- source URL: https://tooky.co.uk/the-cucumber-test-trap/
- source type: independent practitioner blog
- notes: Distinct failure mode from E1/E2 (scope/coverage-strategy problem, not syntax-style problem).

## E4
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Screenplay Pattern (actors/abilities/tasks/questions) is a more composable implementation layer than Page Object Model underneath Gherkin steps, improving maintainability as suites scale; complements rather than replaces Gherkin.
- source label: Serenity BDD and Screenplay: A Comprehensive Guide
- source URL: https://www.javathinking.com/blog/serenity-bdd-and-screenplay/
- source type: practitioner blog / tool-adjacent (Serenity BDD ecosystem)
- notes: Single source for this claim; not cross-checked against a second independent source. Confidence medium, not high.

## E5
- date: 2026-07-11
- status: active
- confidence: medium
- claim: A 2026-04-27 "Gherkin Guidelines for AI" markdown reference file exists specifically to prevent AI coding agents from producing vague Then steps, UI-script-style When steps, multi-behavior scenarios, and placeholder Examples; distributed as reusable project context for AI tools (Cursor/Claude/Copilot), positioned for Spec-Driven Development.
- source label: BDD Gherkin Guidelines for AI Coding and Testing
- source URL: https://automationpanda.com/2026/04/27/bdd-gherkin-guidelines-for-ai-coding-and-testing/
- source type: practitioner blog (Automation Panda / Andy Knight, well-known BDD author)
- notes: Recent (within 3 months of research date) and directly relevant to this project's own AI-authored SDD Gherkin practice; not independently verified beyond the fetched summary.

## E6
- date: 2026-07-11
- status: active
- confidence: high
- claim: BDD/Gherkin is a collaboration/communication practice, not a test-automation tool by itself; using it purely as automation without the stakeholder-conversation half is a misapplication.
- source label: BDD is not test automation
- source URL: https://cucumber.io/blog/bdd/bdd-is-not-test-automation/
- source type: official blog (Cucumber)
- notes: Corroborates E3's "scope discipline" framing from the tool maintainer's own perspective.

## E7
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Code-first alternatives (CodeceptJS Smart DSL, Karate, Playwright/Cypress/WebdriverIO/TestCafe directly) are commonly chosen over Gherkin+Cucumber for UI E2E testing in 2026, especially when no non-technical stakeholder actually reads the feature files.
- source label: Top 6 Alternatives to Cucumber for Gherkin + multiple Testing
- source URL: https://testdriver.ai/articles/top-6-alternatives-to-cucumber-for-gherkin-multiple-testing
- source type: vendor/aggregator content (TestDriver.ai) — commercial motive to promote alternatives
- notes: Treat framework-choice framing as directionally useful but not neutral; cross-checked against independent Gauge comparison (E8) for consistency.

## E8
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Gauge uses markdown instead of Gherkin's fixed grammar, has stronger refactor tooling (rename-step-across-specs) and better performance at 1000+ scenarios, but is more prone to inconsistent scenario style across a team and has a smaller ecosystem than Cucumber.
- source label: Gauge vs Cucumber: BDD Frameworks Compared 2026
- source URL: https://qaskills.sh/blog/gauge-vs-cucumber-bdd-frameworks
- source type: comparison/aggregator blog
- notes: Single-source performance claim (20-30% at scale) not independently verified against a benchmark.

## E9
- date: 2026-07-11
- status: active
- confidence: low
- claim: AI-native natural-language UI testing platforms (testRigor, Autify Aximo, Functionize, QA Wolf, CoTester) author tests in plain English or via autonomous exploration using semantic/visual locators, bypassing Gherkin's formal grammar, and are positioned as the 2026 direction for reducing test maintenance.
- source label: Best AI Agents for Software Testing in 2026 (and related aggregator results)
- source URL: search-result summaries only, no single page fetched (see topic.md source angle)
- source type: vendor marketing / listicle aggregation
- notes: Not independently fetched or verified against a primary source; maturity vs. marketing claims unconfirmed. Confidence deliberately low — flagged as an open question in topic.md.

## E10
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Concrete Gherkin style rules: limit ~2-3 "And" steps per section, one When-Then per scenario, extract repeated setup into Background, build a reusable step library, use tags for selective execution (@smoke/@e2e), keep scenarios independent/deterministic, and prefer testing business logic below the UI layer over UI-level Gherkin where possible.
- source label: Gherkin best practices (andredesousa)
- source URL: https://github.com/andredesousa/gherkin-best-practices
- source type: community-maintained guideline repo (GitHub)
- notes: Aggregates widely-repeated community consensus rather than a single novel claim; consistent with E11/E12.

## E11
- date: 2026-07-11
- status: active
- confidence: high
- claim: Canonical BDD rules: "one scenario, one behavior" (single When-Then pair), strict Given(state)/When(action)/Then(outcome) ordering with no type repeats, third-person present-tense phrasing, ~12 scenarios/feature and <10 steps/scenario as soft caps, avoid "Or" steps (use Scenario Outline instead), treat data tables as illustrative not exhaustive.
- source label: BDD 101: Writing Good Gherkin
- source URL: https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/
- source type: practitioner reference (Andy Knight / Automation Panda), widely cited as canonical in the BDD community
- notes: Older (2017) but explicitly still linked from the 2026 AI-guidelines piece (E5) as foundational — treated as durable, not stale, guidance.

## E12
- date: 2026-07-11
- status: active
- confidence: high
- claim: UI-driven Cucumber tests break frequently, run slowly, document poorly, and fail to surface domain language; fix is testing business logic beneath the UI using domain terms. Separately: ambiguous "I" pronouns in multi-actor systems, noisy/redundant scenarios, and Scenario Outline overuse are named anti-patterns — the last one specifically flagged as dangerous when combined with slow UI tests (outline rows multiply scenario count and thus runtime).
- source label: Cucumber anti-patterns (part two)
- source URL: https://cucumber.io/blog/bdd/cucumber-anti-patterns-part-two/
- source type: official blog (Cucumber)
- notes: Tool-maintainer source; directly corroborates E1/E2/E3's UI-brittleness theme and adds the Scenario-Outline-times-UI-slowness interaction not covered elsewhere.

## E13
- date: 2026-07-11
- status: active
- confidence: medium
- claim: BDD's collaborative core is the "Three Amigos" (business + development + testing) jointly discovering and writing scenarios; Example Mapping is the concrete facilitation technique (Rules/Examples/Questions cards) used in that session before Gherkin is written.
- source label: Who does what? (Cucumber docs)
- source URL: https://cucumber.io/docs/bdd/who-does-what/
- source type: official docs (Cucumber)
- notes: Corroborated independently by E14 (practitioner workshop write-up), raising confidence.

## E14
- date: 2026-07-11
- status: active
- confidence: medium
- claim: A Three Amigos Requirements Discovery workshop structure — business explains intent, examples surface edge cases, dev/test translate into acceptance criteria — is the concrete mechanism for avoiding solo-authored, unrealistic Gherkin scenarios.
- source label: The anatomy of a Three Amigos Requirements Discovery workshop
- source URL: https://johnfergusonsmart.com/three-amigos-requirements-discovery/
- source type: practitioner blog (John Ferguson Smart, Serenity BDD's author — same author as E4/E15 Screenplay material)
- notes: Same author/ecosystem as E4/E15; treat as one voice corroborated by the independent Cucumber-official source E13, not two fully independent sources.

## E15
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Serenity/JS's Screenplay implementation: actors `attemptsTo()` composable Tasks (domain-workflow-level, e.g. "adds a todo item"), Tasks compose lower-level Interactions (Enter, Click, Navigate), and Questions read back page/app state for assertions; works across Playwright, Selenium, and Cucumber step definitions.
- source label: Screenplay Pattern — Serenity/JS handbook
- source URL: https://serenity-js.org/handbook/design/screenplay-pattern/
- source type: official framework docs (Serenity/JS)
- notes: Primary source for the pattern's concrete shape; same ecosystem as E4 (not independent), but this is the closest thing to a primary/canonical reference for the pattern itself.

## E16
- date: 2026-07-11
- status: active
- confidence: medium
- claim: gherkin-lint is a static linter for Gherkin feature files (configurable rules for tags, duplicate names, length, etc.), runnable in CI to enforce style-checklist rules automatically rather than relying on manual review.
- source label: gherkin-lint (GitHub)
- source URL: https://github.com/gherkin-lint/gherkin-lint
- source type: open-source tool repo
- notes: Tooling existence is directly verifiable (it's a real, installable npm package); not independently benchmarked for rule coverage completeness here.

## E17
- date: 2026-07-11
- status: active
- confidence: low
- claim: "Living documentation" (e.g. CucumberStudio) keeps Gherkin specs synced with execution results so feature files function as durable, browsable documentation for business stakeholders rather than write-once test code.
- source label: Living documentation — CucumberStudio docs
- source URL: https://support.smartbear.com/cucumberstudio/docs/bdd/living-doc.html
- source type: vendor product docs (SmartBear/CucumberStudio)
- notes: Vendor-sourced description of their own product's value proposition; directionally useful but not an independent assessment of whether living documentation actually gets used/read in practice (ties back to the open contradiction already logged in topic.md about whether the stakeholder audience is real).

## E18
- date: 2026-07-11
- status: active
- confidence: medium
- claim: POM fails at scale via three concrete mechanisms — page classes bloat without organizational boundaries, business logic leaks into page classes, and actions are hard to reuse across workflows since POM organizes by screen not by task; Screenplay's task reusability and separation of concerns fix this. Decision heuristic: pick POM for a small quick UI-only suite, Screenplay once the product spans multiple modules/APIs with a growing QA team.
- source label: Page Object vs Screenplay Pattern — Which One Scales Better for Large Teams?
- source URL: https://medium.com/@gunashekarr11/page-object-vs-screenplay-pattern-which-one-scales-better-for-large-teams-3fe007b80d49
- source type: independent practitioner blog (not Serenity-ecosystem-affiliated)
- notes: Independent of E4/E15 (Serenity ecosystem) — corroborates the same directional claim from an outside source, raising overall confidence in the "Screenplay scales better" claim, though still qualitative/anecdotal not benchmarked.

## E19
- date: 2026-07-11
- status: active
- confidence: medium
- claim: The Screenplay-vs-POM tradeoff is a complexity *relocation*: POM keeps call sites simple but pushes wait/locator handling into every test; Screenplay pushes that complexity into reusable Ability/Interaction base classes so Task call-sites stay fluent, but only pays off if reused enough. Screenplay's genuine strength is multi-actor scenarios (e.g. Alice/Bob/Eve security tests, role-based access) that are awkward in POM. Downsides identified: as of 2021, Serenity documentation was "severely lacking," adoption was minimal, and the pattern was unproven at scale in production.
- source label: Screenplay Pattern vs The Page Object Model — alice, bob & eve have lunch
- source URL: https://jberri.gitlab.io/jgb/posts/2021-11-26-screenplay-vs-page-object-model/
- source type: independent practitioner blog, explicitly critical/skeptical in tone (not vendor-affiliated)
- notes: Most balanced/critical source found on this sub-question — explicitly weighs costs, not just benefits. Dated 2021; the documentation-maturity criticism is likely stale given Serenity/JS's current handbook (E15) is comprehensive — flagged as such in topic.md rather than treated as still-true.

## E20
- date: 2026-07-11
- status: active
- confidence: medium
- claim: Screenplay was created because acceptance-test code connecting to APIs/DBs/UIs "can quickly get out of hand" without the same maintainability discipline as production code; it organizes code via a theatrical metaphor (actors performing Interactions, composed into Tasks) as an alternative to Page Objects' hierarchical class structure.
- source label: Understanding Screenplay (part #1)
- source URL: https://cucumber.io/blog/bdd/understanding-screenplay-part-1/
- source type: official blog (Cucumber, written by Matt Wynne, a Cucumber co-creator)
- notes: Authoritative on *why* the pattern exists and its relationship to BDD's maintainability goals generally; doesn't itself provide a POM comparison in depth (that's E18/E19).

## E21
- date: 2026-07-11
- status: active
- confidence: medium-high
- claim: playwright-bdd compiles Gherkin `.feature` files into native Playwright Test spec files via a `bddgen` codegen step, then runs them under Playwright's own test runner — giving full native fixtures, parallelism/sharding, and built-in trace/video/screenshot capture with no compatibility shim, unlike running Cucumber.js on top of Playwright where Cucumber stays the runner.
- source label: vitalets/playwright-bdd (GitHub)
- source URL: https://github.com/vitalets/playwright-bdd
- source type: official project repo (maintainer: Vitaliy Potapov)
- notes: Primary source for the tool's own architecture claim; corroborated by an independent write-up (E24).

## E22
- date: 2026-07-11
- status: active
- confidence: medium-high
- claim: Serenity/JS's Playwright Test integration (`@serenity-js/playwright-test`) does not require Gherkin/Cucumber — it works directly inside plain Playwright Test files via dedicated fixtures, exposing the Screenplay Pattern APIs. A separate official template (`serenity-js-cucumber-playwright-template`) exists specifically for teams wanting Gherkin + Screenplay + Playwright together, with Cucumber.js supplying the Gherkin parsing/runner layer underneath.
- source label: Serenity/JS Playwright Test handbook + serenity-js-cucumber-playwright-template
- source URL: https://serenity-js.org/handbook/test-runners/playwright-test/ ; https://github.com/serenity-js/serenity-js-cucumber-playwright-template
- source type: official framework docs + official template repo
- notes: Confirms Gherkin is optional in Serenity/JS's primary/idiomatic integration path, contrary to an assumption that Serenity/JS = Gherkin-based testing.

## E23
- date: 2026-07-11
- status: active
- confidence: medium
- claim: QuickPickle parses `.feature` files with the official Gherkin parser and runs scenarios as native Vitest tests via Vite's transform pipeline (configured in vite.config.ts, no separate Cucumber runner/config). `@quickpickle/vitest-browser` runs those scenarios inside Vitest Browser Mode for component-level UI testing. `@quickpickle/playwright` is a separate companion giving the Vitest-run scenarios a real Playwright browser instance (via a "World" object) for full E2E, with built-in step definitions (`/actions`, `/outcomes`) and multi-browser support — but its step-definition API is explicitly marked NOT STABLE by the maintainer, which is why the package hasn't reached a full release.
- source label: dnotes/quickpickle (GitHub) + @quickpickle/playwright (npm)
- source URL: https://github.com/dnotes/quickpickle ; https://www.npmjs.com/package/@quickpickle/playwright
- source type: official project repo + official npm package page
- notes: Primary source for QuickPickle's own architecture and stability claims about its own package — this is the maintainer's own stability disclosure, high-trust for that specific claim.

## E24
- date: 2026-07-11
- status: active
- confidence: medium
- claim: playwright-bdd's `bddgen` step converts .feature files into executable Playwright test files ahead of test execution; supports step decorators for class methods and scoped step definitions; provides native access to Playwright's fixtures, parallelism, trace/video/screenshot capture, and reporting "out of the box" because generated tests are genuine Playwright tests.
- source label: Playwright BDD: Setup, Gherkin & E2E Testing Guide
- source URL: https://testdino.com/blog/playwright-bdd
- source type: vendor/aggregator blog (TestDino)
- notes: Independent corroboration of E21's architectural claim from a different (vendor-adjacent) source — consistent, raises confidence in the core "compiles to native Playwright tests" claim specifically.

## E25
- date: 2026-07-11
- status: active
- confidence: medium
- claim: vitest-cucumber (amiceli) ships browser-mode support (`@amiceli/vitest-cucumber/browser`, since v4.3.0) requiring a browser provider configured in vitest.config.js (commonly Playwright+Chromium) plus `globals: true`; once set up, .feature files load via the `/browser` import and run as Vitest Browser Mode tests with full Gherkin feature parity (Background, tags, data tables, hooks). Playwright here is one possible browser provider underneath Vitest Browser Mode, not the test runner, and not a required dependency (WebdriverIO is also a supported provider for Vitest Browser Mode generally).
- source label: Browser mode — vitest-cucumber docs
- source URL: https://vitest-cucumber.miceli.click/get-started/browser-mode/
- source type: official project docs
- notes: Primary source; independent tool/maintainer from QuickPickle (E23), giving two separate implementations of the same "Gherkin inside Vitest Browser Mode" architecture — corroborates that this pattern is a real, repeated approach rather than one project's idiosyncrasy.

## E26
- date: 2026-07-11
- status: active
- confidence: low
- claim: @deepracticex/vitest-cucumber exists as another Vitest+Gherkin integration aiming for a "native Cucumber API" feel; @quickpickle/playwright's step-definition API instability was self-reported by its maintainer as the reason the package hasn't reached a full release (this second claim is folded into E23 at higher confidence since it was corroborated by the primary npm page directly).
- source label: search-result aggregation (no primary page fetched for @deepracticex/vitest-cucumber)
- source URL: n/a — search summary only
- source type: aggregated search snippet
- notes: Confidence deliberately low for the @deepracticex/vitest-cucumber portion specifically — no independent verification of maturity, maintenance activity, or actual feature completeness.
