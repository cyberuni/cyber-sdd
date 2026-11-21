@frozen
Feature: config-model-runners — maintain the per-model runner agent-def family
  Unit suite for the config-model-runners engine: an internal, non-invokable skill loaded by the
  config-aced gateway that adds, lists, and removes runner agent definitions (one per model) at their
  user-global canonical paths. Additive only — it never auto-removes a runner a target list omits.
  Authoring a bespoke single agent definition is define-agent; running the skills-under-test is a
  future eval-run capability. Cross-capability e2e scenarios live in ../../workflows/.

  # ---- Reach ----

  Scenario: the engine is reached via the config-aced gateway, not a bare user invocation
    Given a user request to set up per-model runner agents
    When ACED routes the request
    Then the config-aced gateway loads config-model-runners and the engine does not self-trigger from a bare user invocation

  # ---- add ----

  Scenario: add resolves and confirms the target model list before writing
    Given an add request with no explicit model list
    When config-model-runners resolves the target models
    Then it proposes a model list from the curated config or the known model aliases and confirms it with the user rather than guessing

  Scenario: add with an explicit model list resolves to exactly those models
    Given an add request that names an explicit model list
    When config-model-runners resolves the target models
    Then it resolves to exactly the named models and does not fall back to the curated config or the default aliases

  Scenario: add prefers the curated models config over the default aliases when it is present
    Given an add request with no explicit model list and a curated models config present
    When config-model-runners resolves the target models
    Then it resolves to the curated config's model list rather than proposing the default aliases

  Scenario: add creates a runner def for each model that has none
    Given a confirmed target model list and some models without a runner def
    When config-model-runners runs add
    Then it creates one runner def for each target model that had no def

  Scenario: add is idempotent for models that already have a runner def
    Given a target model whose runner def already exists
    When config-model-runners runs add
    Then it leaves the existing def untouched and creates no duplicate

  # ---- runner-def shape ----

  Scenario: the family varies over model only, one def per model
    Given a runner family for a set of models
    When config-model-runners maintains it
    Then each model has exactly one runner def and effort is not a def axis

  Scenario: each runner def is a neutral executor pinned to its model
    Given config-model-runners writes a runner def for a model
    When it drafts the def body
    Then the body is a neutral executor identical across the family, differing only in the pinned model

  Scenario: a runner def is written at its user-global canonical path with runtime symlinks
    Given config-model-runners creates a runner def for a model
    When it writes the def
    Then the canonical file is written under the user-global agents path and one runtime symlink is created per selected runtime

  # ---- list ----

  Scenario: list reports the current runner family
    Given an existing runner family
    When config-model-runners runs list
    Then it reports each model, its runner-def path, and any effort stamp

  # ---- remove (additive-only, never auto-remove) ----

  Scenario: remove deletes only the runner defs the user explicitly names
    Given a remove request naming a specific model
    When config-model-runners runs remove
    Then it deletes only the named model's runner def and leaves the rest of the family intact

  Scenario: a model absent from a target list is never auto-removed
    Given a target model list that omits a model whose runner def exists
    When config-model-runners runs add against that list
    Then it leaves the omitted model's runner def intact and reconcile-deletes nothing

  Scenario: a user-global runner def is deleted only after confirmation
    Given a remove request for an existing runner def
    When config-model-runners carries it out
    Then it deletes the user-global file only after the user confirms

  # ---- optional effort stamp ----

  Scenario: an effort stamp may be applied to an existing runner def on request
    Given a request to stamp an effort on a model's runner def
    When config-model-runners updates the def
    Then it writes the effort field on that def while keeping one def per model
