---
applyTo: "openspec/**"
---

# OpenSpec Instructions

When working on files in `openspec/`:

- `openspec/specs/` contains normative, accepted behavior specifications. Do not modify these directly — use the OpenSpec CLI sync flow.
- `openspec/changes/` contains active change artifacts (proposals, designs, delta specs, tasks). These are the normative source for in-progress work.
- Delta spec sections must use exactly: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, `## RENAMED Requirements`.
- Scenario blocks use `#### Scenario:` with `WHEN` / `THEN` format.
- For modified requirements, copy the entire existing requirement block before editing.
- Validate changes with `openspec validate <change-id> --strict` when possible.
- Do not create or delete change directories without user confirmation.
