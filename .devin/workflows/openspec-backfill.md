---
description: Backfill an OpenSpec change for behaviour that is already implemented in code
---
Use this workflow when code and behaviour already exist, but there is no corresponding OpenSpec change documenting the current intended behaviour.

This workflow is for **backfilling existing behaviour**.
For future/planned work, use `/opsx:propose` instead.

## 1. Confirm this is really a backfill

Use this workflow only when all are true:

- The code and externally visible behaviour already exist.
- The behaviour is intended to remain.
- There is no active OpenSpec change already capturing the same behaviour.

If the behaviour is still under discussion or likely to change during implementation, use `/opsx:propose` instead.

## 2. Ensure the repository is initialized for the current CLI

1. Check whether OpenSpec has been initialized for this repo.
2. If `openspec/changes/` is missing or OpenSpec reports initialization errors, run:

   ```bash
   openspec init
   ```

3. After initialization, prefer the current generated integrations:
   - Windsurf workflows: `/opsx:propose`, `/opsx:explore`, `/opsx:apply`, `/opsx:archive`
   - Codex skills: `openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-archive-change`

## 3. Choose a verb-led backfill change id

1. Pick a unique kebab-case, verb-led change id.
2. Prefer names like:
   - `backfill-subagent-support`
   - `document-codex-metadata-enrichment`
   - `capture-conversation-filter-behaviour`

3. Check for collisions:

   ```bash
   openspec list --json
   ```

## 4. Create the change with the current CLI flow

Create the change using the current artifact-guided workflow:

```bash
openspec new change "<change-id>"
openspec status --change "<change-id>" --json
```

Do **not** manually scaffold directories first unless the CLI is unavailable.

## 5. Build artifacts using CLI instructions

For the new change, use the current CLI instruction flow:

```bash
openspec instructions proposal --change "<change-id>" --json
openspec instructions design --change "<change-id>" --json
openspec instructions specs --change "<change-id>" --json
openspec instructions tasks --change "<change-id>" --json
```

Follow the returned `instruction`, `template`, `outputPath`, and dependency ordering.

### Proposal guidance

- State that this is a backfill of already-implemented behaviour.
- Name the capability or capabilities being introduced or modified.
- List the already-implemented code paths affected.

### Design guidance

- Explain the current architecture and normalization/decision points.
- Record current constraints and trade-offs.
- Do not invent future behavior unless explicitly requested.

### Specs guidance

- Create one spec file per capability listed in the proposal.
- Use delta sections exactly as required by the CLI:
  - `## ADDED Requirements`
  - `## MODIFIED Requirements`
  - `## REMOVED Requirements`
  - `## RENAMED Requirements`
- Use `#### Scenario:` blocks with `WHEN` / `THEN` format.
- For modified requirements, copy the entire existing requirement block before editing.

### Tasks guidance

Because this is a backfill, tasks should focus on:

- Reviewing current code and behavior
- Aligning proposal / design / specs with reality
- Running validation
- Updating adjacent docs only if needed

Tasks do **not** need to imply new feature work unless the backfill reveals a real mismatch that must be fixed.

## 6. Align artifacts with the existing codebase

Cross-check the artifacts against:

- Current implementation
- Existing tests
- Relevant docs
- Known shipped behavior in `CHANGELOG.md`

If you discover a mismatch, choose explicitly:

- Fix the code to match intended behavior, then document that behavior
- Or accept the current behavior and document it clearly

Avoid leaving hidden behavior undocumented.

## 7. Validate with the current CLI

Run strict validation on the change:

```bash
openspec validate <change-id> --strict
```

If validation fails, fix the artifacts and rerun until it passes.

Useful follow-up checks:

```bash
openspec status --change "<change-id>" --json
```

## 8. Hand off or continue

After a successful backfill:

- If no code change is needed, stop and report that the spec baseline is ready.
- If follow-up implementation is needed, continue with `/opsx:apply`.
- If more design clarification is needed, use `/opsx:explore`.

## 9. Archive only after the backfill becomes the accepted baseline

Once the documented behaviour is accepted and deployed as the new truth, archive the change:

```bash
openspec archive <change-id> --yes
```

If the change is docs-only or should not update main specs during archive, decide explicitly whether `--skip-specs` is appropriate.
