---
name: wrap-up
description: End-of-session checklist for documentation and task closure. Use when ending a work session or completing a task.
---

Execute end-of-session wrap-up checklist.

**When to use**: When ending a work session, completing a task, or before committing changes.

## Steps

1. **Analyze what changed**

   ```bash
   git diff --stat
   ```

   Or if already staged:

   ```bash
   git diff --cached --stat
   ```

2. **Check CHANGELOG.md** (if src/ or UI changed)

   - Read current `## Unreleased` section
   - Identify user-facing changes not yet recorded
   - Add entries for: features, bug fixes, UI changes, performance improvements
   - Skip: internal refactors, tests-only, documentation typos

   **Entry format**:

   ```markdown
   - `YYYY-MM-DD` — Brief description
     - Technical detail
     - User impact
   ```

3. **Check ROADMAP.md** (if items completed)

   - Move shipped items from `## In Progress` to CHANGELOG
   - Don't duplicate content between files

4. **Check README.md** (if behavior/prerequisites changed)

   - Update setup instructions if dependencies changed
   - Update usage examples if CLI/API changed

5. **Check ADR** (if architectural decisions made)

   - Create new ADR for significant design choices
   - Update existing ADR if decision evolved

6. **Run final validation**

   ```bash
   pnpm test
   pnpm build
   ```

7. **Commit documentation updates**

   ```bash
   git add CHANGELOG.md ROADMAP.md README.md docs/adr/
   git commit -m "docs: update documentation for session wrap-up"
   ```

## Output

```md
## Wrap-up Complete

**Files analyzed**: N changed
**CHANGELOG**: [updated / no changes needed]
**ROADMAP**: [updated / no changes needed]
**README**: [updated / no changes needed]
**ADR**: [updated / no changes needed]

**Commits**: [N new commits]
**Tests**: [pass / N failures]
**Build**: [success / failed]
```

## Quick mode

If you just want a summary without making changes:
> "Wrap up — summary only"

This will analyze and report what needs updating without modifying files.
