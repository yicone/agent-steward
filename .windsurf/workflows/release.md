---
name: "Release"
description: Execute version bump and release for the project
category: Workflow
tags: [release, versioning, publish]
---

Execute a version bump and release for Agent Storage Manager.

**Input**: Version bump type (patch/minor/major). Optional: specific version notes.

## Prerequisites Check

Before proceeding, verify:

- [ ] Working directory is clean (`git status` shows no uncommitted changes)
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] CHANGELOG.md has been updated with pending changes under `## Unreleased`

If any check fails, stop and report the issue.

## Release Steps

1. **Confirm bump type**

   Announce the version change:
   - `patch`: 0.1.0 → 0.1.1 (bug fixes)
   - `minor`: 0.1.0 → 0.2.0 (new features)
   - `major`: 0.1.0 → 1.0.0 (breaking changes)

2. **Execute version bump**

   ```bash
   pnpm version:<type>
   # or: npm version patch|minor|major
   ```

   This will:
   - Update `package.json` version
   - Create git commit `chore(release): x.x.x`
   - Create git tag `vx.x.x`
   - Push to origin

3. **Update CHANGELOG**

   Move entries from `## Unreleased` to a new version section:

   ```markdown
   ## [0.1.1] - YYYY-MM-DD

   ### Fixed
   - Previous unreleased fixes...

   ### Added
   - Previous unreleased additions...
   ```

   Commit this change:

   ```bash
   git add CHANGELOG.md
   git commit -m "docs(changelog): update for vx.x.x"
   git push
   ```

4. **Create GitHub Release** (optional)

   If requested, use GitHub CLI or web interface to:
   - Create release from the new tag
   - Copy relevant CHANGELOG section as release notes

   **Output**

   ```md
   ## Release Complete: vx.x.x

   - Version bumped in package.json
   - Git tag created and pushed
   - CHANGELOG updated
   - [GitHub release created]

   Next steps:
   - Verify the release on GitHub: https://github.com/yicone/agent-storage-manager/releases
   - [Other post-release tasks if applicable]
   ```

## Guardrails

- Never release with a dirty working directory
- Always run tests before releasing
- Always update CHANGELOG before or immediately after version bump
- For pre-1.0 versions, prefer minor bumps for significant features
- Do not create GitHub release without explicit user request
