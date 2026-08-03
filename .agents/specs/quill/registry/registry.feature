Feature: registry — register Quill as the documentation SDD plugin
  Unit suite for the init-quill skill: record the quill entry in .agents/universal-plugin.json so the
  SDD conductor resolves Quill for the documentation artifact-types by reading only that one file.
  Safe to repeat, fail-closed. Cross-capability flows live in ../workflows/.

  # ── Activation ──

  @trigger
  Scenario Outline: init-quill engages only on a request to register quill in this project
    Given a repo whose .agents/universal-plugin.json records an entry for the aced plugin and none for quill
    And the user says "<query>"
    When the harness selects a skill for that request
    Then whether a quill entry is written to .agents/universal-plugin.json is <should_trigger>

    Examples:
      | query                                                                      | should_trigger |
      | register quill as the documentation plugin for this repo                   | true           |
      | set the project up so the SDD conductor uses quill for our guides          | true           |
      | we upgraded quill, refresh its plugin registry entry                       | true           |
      | write the getting-started guide for quill                                  | false          |
      | register aced as the SDD plugin for our skills                             | false          |
      | publish the quill plugin to the universal marketplace                      | false          |
      | add a rule to quill's documentation spec bar                               | false          |

  # ── Registration ──

  @behavior
  Scenario: an absent quill entry is added as the canonical squad
    Given a valid registry file whose sdd-plugins list holds no quill entry
    When init-quill registers quill
    Then the added quill squad serves documentation, guide, tutorial, article, and reference
    And that squad binds spec-producer to quill-spec-writer, impl-producer to quill-doc-writer, and impl-judge to quill-judge, leaving solution-producer and spec-judge unbound
    And that squad binds builder-spec to quill-builder-spec and builder-impl to quill-builder-impl, leaving oracle-spec, architect-spec, and architect-impl unbound

  @behavior
  Scenario: a missing registry file is created holding the quill entry
    Given a project root with no .agents/universal-plugin.json
    When init-quill registers quill
    Then .agents/universal-plugin.json exists afterwards and its sdd-plugins list holds the quill entry

  @behavior
  Scenario: a registry without an sdd-plugins list gets one
    Given a registry file whose contents are the valid JSON object {}
    When init-quill registers quill
    Then the file afterwards holds an sdd-plugins list containing the quill entry

  @behavior
  Scenario: another plugin's entry survives registration byte-for-byte
    Given a valid registry whose sdd-plugins list holds an aced entry with its own version and squads
    When init-quill registers quill
    Then the aced entry afterwards is byte-for-byte the aced entry that was there before

  # ── Migration ──

  @behavior
  Scenario: a pre-operator role-key entry is rewritten into the squads shape
    Given a valid registry whose quill entry binds roles under the keys scenario-advisor and implementer
    When init-quill registers quill
    Then the quill entry afterwards carries a squads list and carries neither a scenario-advisor nor an implementer key

  @behavior
  Scenario: a legacy domains entry is rewritten into the squads shape
    Given a valid registry whose quill entry carries a domains list beside a single shared roles map
    When init-quill registers quill
    Then the quill entry afterwards carries a squads list and carries no domains key

  # ── Version stamp ──

  @behavior
  Scenario: a differing version stamp is rewritten to the manifest version
    Given a valid registry whose quill entry is in the squads shape and is stamped 0.4.0
    And quill's own plugin manifest declares a version other than 0.4.0
    When init-quill registers quill
    Then the quill entry afterwards is stamped with the version quill's plugin manifest declares

  @behavior
  Scenario: a matching version stamp leaves the file as it was
    Given a valid registry whose quill entry is in the squads shape and is stamped with the version quill's plugin manifest declares
    When init-quill registers quill
    Then the file afterwards is byte-for-byte the file that was there before

  # ── Fail closed ──

  @behavior
  Scenario: a registry that is not valid JSON is left exactly as found
    Given a registry file whose contents are the text {"sdd-plugins": [ and nothing more
    When init-quill registers quill
    Then it reports an error naming the file as unparseable
    And the file afterwards is byte-for-byte the file that was there before

  # ── Confirmation ──

  @behavior
  Scenario: a completed registration is reported with its stamp and artifact-types
    Given init-quill has just written the quill entry to .agents/universal-plugin.json
    When init-quill reports the result
    Then the report names .agents/universal-plugin.json, the version it stamped, and the five artifact-types documentation, guide, tutorial, article, and reference
