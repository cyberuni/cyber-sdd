@frozen
Feature: The resume procedure — pick a mission up from its plan brief, bars included
  Unit suite for the resume unit (the resume-mission skill). Reading the plan brief to continue the
  Mission Loop, and re-establishing the bars for the role the resumed segment will run — decisions
  reloaded from the brief, bars reloaded from disk. Cross-capability e2e scenarios live in
  ../../workflows/.

  # ── resume the mission ──

  Scenario: a resume reads the brief's todos, NEXT anchor, and resolved decisions
    Given a mission whose plan brief carries todos, a NEXT anchor, and a resolved decisions block
    When a session resumes the mission
    Then it names the next action from the brief's in-progress todo

  Scenario: a resume with no brief scaffolds a minimal one and starts from it
    Given a mission ref with no plan brief at the plans location
    When a session resumes the mission
    Then a plan brief carrying frontmatter todos and a NEXT anchor exists at the plans location

  Scenario: an open decision in NEXT stops the segment at that decision
    Given a brief whose NEXT anchor names an unresolved open marker
    When a session resumes the mission
    Then it reports that open decision and writes no artifact past it

  Scenario: a brief with no open decision continues to the next action
    Given a brief whose NEXT anchor names an action and no open marker
    When a session resumes the mission
    Then it proceeds to that action

  # ── re-establish the bars ──

  Scenario: a segment that will run a role re-resolves its governances
    Given a resumed segment whose next action runs the spec-producer role
    When the segment starts
    Then it runs the governance matcher over the artifact-types of the files it will touch

  Scenario: a segment owing no bar declares an empty loaded set
    Given a resumed segment whose next action runs neither a production role nor a gate
    When the segment starts
    Then its declared loaded-governance set is present and empty

  Scenario: a bar the earlier segment never declared appears in this segment's declared set
    Given a resumed segment whose matcher returns a bar the brief's earlier segment did not declare
    When the segment starts
    Then its declared loaded-governance set names that bar

  Scenario: a brief's summary of a bar does not stand in for the bar
    Given a brief whose resolved decisions block restates a bar's rule in place of naming the bar
    And that bar is among the segment's resolved candidates
    When the segment starts
    Then its declared loaded-governance set names that bar

  Scenario: a brief that summarizes no bar proceeds on the loaded bars
    Given a brief whose resolved decisions block names its bars without restating their rules
    When the segment starts
    Then its declared loaded-governance set names each resolved candidate

  Scenario: a bar contradicting a resolved decision reopens that decision
    Given a resumed segment whose loaded bar requires an outcome the brief records as decided otherwise
    When the segment reads the two together
    Then the brief records that decision as reopened and names the bar as the evidence

  Scenario: resolved decisions the bars do not contradict are not relitigated
    Given a resumed segment whose loaded bars require nothing the brief decided otherwise
    When the segment reads the two together
    Then the brief's resolved decisions block is unchanged

  Scenario: a resumed segment declares the bars it loaded this segment
    Given a resumed segment whose brief records a smaller declared set than this segment's matcher returns
    When it dispatches the cold spec-judge
    Then the dispatch carries the larger set this segment resolved
