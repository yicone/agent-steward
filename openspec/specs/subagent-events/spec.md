# subagent-events Specification

## Purpose
Define the accepted baseline for how Antigravity and Codex subagent activity is normalized, preserved, and exposed in the unified trajectory viewer.

## Requirements
### Requirement: Antigravity browser subagent steps SHALL normalize to subagent events
The system SHALL normalize `CORTEX_STEP_TYPE_BROWSER_SUBAGENT` steps from Antigravity into trajectory events with kind `subagent` and preserve browser task metadata.

#### Scenario: Antigravity browser subagent includes task metadata
- **WHEN** an Antigravity trajectory step has type `CORTEX_STEP_TYPE_BROWSER_SUBAGENT` and contains `browserSubagent.taskName` or `browserSubagent.task`
- **THEN** the normalized event kind is `subagent`
- **THEN** the event title identifies the browser subagent step
- **THEN** the event subagent metadata includes `type: "browser"`, `source: "antigravity"`, and the original Antigravity step type
- **THEN** the event preserves the task name and task description when present

#### Scenario: Antigravity browser subagent without task name falls back gracefully
- **WHEN** an Antigravity browser subagent step omits `browserSubagent.taskName`
- **THEN** the normalized event remains kind `subagent`
- **THEN** the event still preserves the task description if present
- **THEN** the rendered text falls back to a generic browser task label instead of failing normalization

### Requirement: Codex subagent-like function calls SHALL normalize to subagent events
The system SHALL detect implemented Codex subagent patterns from function-call names and normalize matched calls and matched outputs as `subagent` events.

#### Scenario: Codex browser subagent function call is detected
- **WHEN** a Codex function call name matches the implemented browser subagent patterns
- **THEN** the normalized event kind is `subagent`
- **THEN** the subagent metadata includes `source: "codex"` and the original Codex function name
- **THEN** the event preserves a task description extracted from supported argument fields when available

#### Scenario: Codex matched function output remains a subagent event
- **WHEN** a Codex function result or function call output corresponds to a matched subagent function name
- **THEN** the normalized result event kind is `subagent`
- **THEN** the result preserves source and function-name metadata needed to associate it with the subagent invocation

### Requirement: Non-subagent Codex tools SHALL remain tool events
The system SHALL avoid reclassifying ordinary Codex tool/function events as subagent events when their names do not match implemented subagent detection patterns.

#### Scenario: Regular Codex tools remain tool events
- **WHEN** a Codex function call uses a regular tool name that does not match implemented subagent detection patterns
- **THEN** the normalized event kind remains `tool`
- **THEN** no subagent metadata is attached to that event

### Requirement: Viewer behavior SHALL expose subagent events distinctly
The system SHALL expose normalized subagent events to viewer summary, search, filter, and event rendering behavior as a first-class event kind.

#### Scenario: Viewer summary and filters include subagent events
- **WHEN** normalized trajectory events include one or more `subagent` events
- **THEN** trajectory summaries include a subagent count
- **THEN** filter state can independently include or exclude subagent events

#### Scenario: Viewer search and rendering cover subagent metadata
- **WHEN** a user searches trajectory content or inspects a rendered subagent event
- **THEN** search matching includes supported subagent metadata fields such as type, task name, task description, and source-specific identifiers
- **THEN** rendered subagent events display distinct visual treatment and subagent type labeling

