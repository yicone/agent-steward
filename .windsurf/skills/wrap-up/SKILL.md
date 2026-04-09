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

3. **Check GitHub Issues** (execution layer)

   - Close Issues for completed work
   - Create new Issues for upcoming work
   - Use labels/milestones for mid-term planning (2 weeks-3 months)

   Don't duplicate: Close Issue → CHANGELOG entry

4. **Check OpenSpec artifacts** (if `openspec/` changed)

   - Keep proposal, design, specs, and tasks aligned with the actual implementation
   - Run `openspec validate <change-id> --strict` for the affected change when possible
   - If an OpenSpec change exists for the work, treat it as the normative source for intended behavior

5. **Check README.md** (if behavior/prerequisites changed)

   - Update setup instructions if dependencies changed
   - Update usage examples if CLI/API changed

6. **Check ADR** (if architectural decisions made)

   - Create new ADR for significant design choices
   - Update existing ADR if decision evolved

7. **Run final validation**

   ```bash
   pnpm test
   pnpm build
   ```

8. **Commit documentation updates**

   ```bash
   git add CHANGELOG.md README.md docs/adr/ openspec/
   git commit -m "docs: update documentation for session wrap-up"
   ```

## Output

```md
## Wrap-up Complete

**Files analyzed**: N changed
**CHANGELOG**: [updated / no changes needed]
**OpenSpec**: [updated / no changes needed]
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
