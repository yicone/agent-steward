## Context

`project-bundle` is now part of the accepted `Backup / Migration` workflow set.
It validates an explicit composition, confirms generation, and writes a local
`project-bundle/v1` JSON file. Review follow-up #67 identified hardening work
around API bypasses, output-root validation, missing package handling, path
privacy, deterministic session backup reuse, and coverage gaps.

This design keeps the existing v1 product boundary intact:

- local-only bundle generation
- explicit composition before generation
- reuse of existing session backup packages
- no restore, migration apply, cloud sync, or runtime continuation
- no non-core member toggles

## Goals / Non-Goals

**Goals:**

- Make `/api/project-bundles` reject malformed modes and generation requests
  that skip explicit composition/configuration.
- Represent validation failures and warnings at the correct level: global
  blockers for structural/output-root failures, member warnings for recoverable
  object issues, and unresolved session references for missing backup packages.
- Keep client-facing responses and UI display free of raw absolute local paths
  and raw exception text.
- Ensure generation responses return only the summary, package identity,
  validation summary, inventory, and member references needed by the UI.
- Make session backup reference lookup deterministic by selecting the newest
  matching backup package for each explicit session selection.
- Add focused tests that exercise service, API, and UI behavior around these
  hardening guarantees.

**Non-Goals:**

- No new bundle member categories.
- No source-copy, cache, index, app-state, token, or secret inclusion toggles.
- No project bundle import/restore flow.
- No migration apply or cross-machine transfer behavior.
- No privacy-redaction feature line beyond avoiding accidental local path or
  exception disclosure in this workflow.
- No replacement of session backup package format or session backup generation.

## Decisions

### 1. Treat API hardening as workflow boundary enforcement

`validate` can continue to derive a default selection when the UI is browsing or
previewing bundle composition. `generate` MUST require explicit `selection` and
`configuration` in the request body. This prevents API callers from bypassing
the composition/configuration workflow by invoking generation with defaults.

Alternative considered: require explicit inputs for both `validate` and
`generate`. That is stricter but would make the interactive UI more brittle
because validation is also used to explain the starting composition. The
security-relevant boundary is generation.

### 2. Use structured errors instead of exception-shaped errors

The API should return stable `code`, `title`, and `hint` fields for invalid JSON,
unknown modes, missing generation inputs, validation failure, or generation
failure. It should not return raw thrown messages or filesystem paths. Service
validation items should likewise use product terms such as "project bundle
output root is not writable" rather than raw OS exceptions.

Alternative considered: expose raw service messages for faster debugging. That
is inappropriate for this local-first app because paths, usernames, ports, and
diagnostics can be sensitive.

### 3. Keep output-root failures global

Output-root readiness is a structural precondition for generation, not a
specific member category problem. Validation should model it as a global blocker
so the UI does not imply that a category such as `package-metadata` or
`sessions` is at fault.

Alternative considered: attach output failures to package metadata because the
bundle file includes project/package metadata. That hides the real remediation:
choose or fix a writable bundle output location.

### 4. Preserve missing session backup intent as an unresolved reference

When a selected session lacks an existing backup package, validation should warn
and generated metadata should preserve a `missing-package`/unresolved member
reference. The bundle must not silently omit the session and must not generate a
new session backup payload as a side effect.

Alternative considered: block generation when any selected session lacks a
backup package. That is safer but conflicts with the accepted foundation
decision that this is a warning-level composition issue in v1.

### 5. Return summary-shaped generation responses

The generated bundle file can contain the full bundle document, but the API
response should return only the fields needed for result display and inspection:
package identity, display-safe file location, timestamp, validation summary,
member inventory, member references, and counts. The UI does not need the full
bundle document echoed back after writing.

Alternative considered: return the full document for easier debugging. That
increases response size and risks leaking future sensitive metadata.

### 6. Select newest matching session backup package deterministically

Session backup reuse should match by explicit session identity (`source`,
`sessionId`, and optional `rootId`) and choose the newest matching manifest by
creation timestamp. Lookup should avoid reading every backup payload when the
manifest already cannot match the requested session IDs.

Alternative considered: use first filesystem traversal match. That is
non-deterministic and can select stale backup packages.

## Risks / Trade-offs

- **Existing behavior may already satisfy some hardening items** -> Keep tests
  as the acceptance mechanism and avoid no-op rewrites.
- **Path redaction can hide useful debugging context** -> Use display-safe paths
  in API/UI while preserving local file writes and package IDs for inspection.
- **Filesystem permission behavior differs by OS** -> Unit tests should mock
  filesystem conditions rather than relying only on host permissions.
- **Session backup stores can become large** -> This slice improves deterministic
  matching and avoids obvious unnecessary reads, but deeper indexing can remain a
  future performance improvement if real usage warrants it.
