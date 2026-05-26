# Windsurf Legacy Recoverability Design

## Context

Agent Storage Manager currently discovers Windsurf sessions from configured roots by scanning local `.pb` files, but readable session content still comes from the live Windsurf language server through LS RPC. This split is acceptable for current Windsurf sessions, but it becomes confusing for legacy session roots such as `~/.codeium/cascade`: the list can show historical sessions while the viewer later fails because the running LS no longer has the referenced trajectory.

Recent investigation confirmed two important facts. First, five legacy Windsurf `.pb` sessions from 2025 can be discovered locally, but all return `trajectory not found` from the live LS. Second, one of those legacy sessions has a readable sidecar under `~/.codeium/brain`, which means recoverability must be modeled separately from LS readability. Investigation also confirmed that Windsurf 2.3.9 exposes the live LS CSRF token through `WINDSURF_CSRF_TOKEN` in process environment, even when older command-line token expectations no longer apply.

The design therefore needs to improve user-facing semantics without changing the architectural decision that LS RPC remains the source of truth for readable Windsurf content.

## Goals / Non-Goals

**Goals:**

- Define a bounded recoverability model for Windsurf sessions that distinguishes LS-readable sessions from partially recoverable or unavailable legacy sessions.
- Surface recoverability state in the Sessions experience with actionable diagnostics instead of opaque transport failures.
- Preserve evidence that can be inspected or preserved when a Windsurf session is locally discoverable but not readable from the live LS.
- Normalize Windsurf attach/token diagnostics so newer builds that expose CSRF via process environment are reported accurately.
- Keep the change local-first and consistent with existing `Backup / Migration` and shell routing boundaries.

**Non-Goals:**

- Reverse-engineer Windsurf `.pb` files into a full transcript source.
- Restore legacy sessions back into Windsurf or claim vendor-runtime restoration.
- Introduce cloud recovery, remote sync, or server-side recovery workflows.
- Redefine canonical session backup format or make raw source preservation the default.

## Decisions

### Decision: Introduce an explicit recoverability classification for Windsurf sessions

The system will classify Windsurf sessions into bounded recoverability states such as LS-readable, partially recoverable, or unavailable. This avoids conflating transport health with data availability.

Alternative considered: treating all LS failures as generic viewer errors. Rejected because `trajectory not found` for a locally discovered session carries different meaning from token failure, port failure, or malformed response.

### Decision: Keep LS RPC as the authority for readable session content

The design preserves ADR-001: readable Windsurf content still comes from LS RPC. Recoverability evidence augments the product's understanding of a session, but it does not replace LS-readable canonical content.

Alternative considered: elevating local `.pb` or `brain` sidecars to a full content source. Rejected because the current evidence is partial, version-specific, and not stable enough for the canonical contract.

### Decision: Route partial recovery through diagnostics and bounded workflow context

When a Windsurf session is not LS-readable, the product will expose structured recoverability evidence through diagnostics and route-only workflow context rather than claiming that a normal session open, backup, or restore is still possible.

Alternative considered: silently hiding unreadable legacy sessions from the list. Rejected because users may intentionally add legacy roots and need the product to acknowledge what was found, even if only partial evidence is available.

### Decision: Treat token source as version-aware process evidence, not only historical args

Windsurf attach logic and diagnostics will treat the live LS token as coming from running process evidence, including environment-provided tokens such as `WINDSURF_CSRF_TOKEN`, rather than assuming only command-line flags or manual override.

Alternative considered: keeping the old `ps_args` mental model and relying on Settings override when it fails. Rejected because it misclassifies newer Windsurf behavior and produces misleading remediation guidance.

## Risks / Trade-offs

- [Recoverability semantics may be misunderstood as restoration support] → Mitigation: specs and UI copy must explicitly distinguish evidence preservation from vendor-runtime reopening or transcript restore.
- [Partial sidecar evidence may vary by version or session] → Mitigation: classify sidecar-backed recovery as bounded and optional; never require it for canonical session behavior.
- [Token-source refinement may require small type and diagnostic changes across multiple modules] → Mitigation: keep the change additive, reuse existing status surfaces, and document version-scoped behavior in storage notes.
- [Users may still expect backup to succeed for unreadable sessions] → Mitigation: route unreadable legacy sessions through validation-first warnings in `Backup / Migration` and do not imply that canonical backup can be produced without readable source content.

## Migration Plan

1. Update Windsurf diagnostics and storage notes to document legacy `trajectory not found` behavior and process-environment token sourcing.
2. Add recoverability classification and evidence collection to Windsurf-specific diagnostics and session metadata enrichment.
3. Update Sessions/Viewer rendering to show recoverability-aware status messaging for unreadable Windsurf sessions.
4. Update `Backup / Migration` routing and validation behavior so unreadable legacy Windsurf sessions can preserve evidence context without implying transcript or vendor-runtime restoration.
5. Roll forward additively; rollback consists of removing the recoverability-specific UI and falling back to existing generic diagnostics.

## Open Questions

- Should the initial recoverability surface appear only in diagnostics and Viewer, or also as a compact badge in the session list on first rollout?
- Should partial-recovery evidence be materialized into the canonical session record as metadata, or remain Windsurf-specific diagnostic context until broader reuse is proven?
- Should token-source vocabulary distinguish `ps_args` from `ps_env`, or is a broader `process` category sufficient for the first compatibility pass?
