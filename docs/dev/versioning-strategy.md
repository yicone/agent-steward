# Versioning Strategy

This document defines how Agent Storage Manager manages versions and releases.

## Current Approach: Manual

We currently use **manual version management** appropriate for early-stage development.

### Why Manual?

1. **Rapid iteration**: Multiple commits per day would trigger excessive automated releases
2. **Exploratory phase**: Feature boundaries are fluid; commits often mix concerns
3. **No release pressure**: The project is not yet published to npm or distributed
4. **Developer experience**: Avoids the cognitive overhead of conventional commits

### Current Versioning

- Format: `0.x.y` (pre-1.0 development)
- `x`: Significant feature milestones
- `y`: Bug fixes and small improvements
- Located in: `package.json` `version` field

## Version Scripts

We provide npm scripts for manual version bumps:

```bash
# Bug fix release (0.1.0 → 0.1.1)
pnpm version:patch

# Feature release (0.1.0 → 0.2.0)
pnpm version:minor

# Breaking change (0.1.0 → 1.0.0)
pnpm version:major
```

Each script will:

1. Bump version in `package.json`
2. Create a git commit with message `chore(release): x.x.x`
3. Create a git tag `vx.x.x`
4. Push commit and tag to origin

## Changelog Maintenance

We follow [Keep a Changelog](https://keepachangelog.com/) format:

- `## Unreleased` section tracks pending changes
- Date-stamped entries within sections
- Sections: `### Added`, `### Fixed`, `### Improved`, `### Changed`
- Move entries to dated version sections on release

## Future: Automated Releases

We will consider adopting **semantic-release** when:

- [ ] Core API stabilizes
- [ ] Commit cadence slows to weekly/monthly
- [ ] External contributors join
- [ ] Regular release schedule is needed

### Semantic Release Benefits

| Problem | Solution |
|---------|----------|
| Forgetting to release | Auto-trigger on every merge |
| Wrong version number | Calculated from commit types |
| Missing changelog | Auto-generated from commits |
| No release notes | Auto-created GitHub releases |

### Migration Path

1. Start using Conventional Commits for new work
2. Add `@semantic-release-bot` to repository
3. Configure `.releaserc.json` with appropriate plugins
4. Switch from manual `npm version` to automated releases

## Related Tools Reference

| Tool | Purpose |
| ------ | --------- |
| [semantic-release](https://github.com/semantic-release/semantic-release) | Core automation engine |
| [release-notes-generator](https://github.com/semantic-release/release-notes-generator) | Generates release notes from commits |
| [changelog](https://github.com/semantic-release/changelog) | Updates CHANGELOG.md automatically |

## Decision Log

- **2026-04-09**: Documented current manual approach with migration criteria
