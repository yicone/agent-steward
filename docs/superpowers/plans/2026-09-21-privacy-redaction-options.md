# Privacy Redaction Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (inline execution is authorized by the current task). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give users an explicit, reviewable way to redact sensitive values from diagnostic exports and Inspector copy actions while warning before raw session values are shown.

**Architecture:** Keep the existing raw diagnostic builder and normalized on-screen transcript unchanged. Add a pure recursive redaction module for strings inside JSON-like values, apply it only when the API receives an explicit redaction option or when an Inspector copy action opts in, and gate raw Inspector fields behind a local warning-confirmed toggle. Redaction remains opt-in so power users retain raw access and no displayed transcript is silently mutated.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Vitest, existing `HomeClient` Inspector and diagnostic route.

---

### Task 1: Define and test the pure redaction contract

**Files:**
- Create: `src/lib/diagnosticRedaction.ts`
- Test: `tests/diagnosticRedaction.test.ts`

- [ ] **Step 1: Write failing tests**

Cover recursive redaction of bearer tokens, common API-key-shaped values, CSRF token assignments, and absolute home paths; preserve non-sensitive values and object/array shape; avoid mutating the input; and keep replacement markers deterministic and idempotent.

Run: `pnpm exec vitest run tests/diagnosticRedaction.test.ts --cache=false`
Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement the minimal pure module**

Export `redactDiagnosticValue(value: unknown): unknown` and focused string helpers. Traverse arrays and plain objects, redact only string values, preserve keys and primitive types, and use stable markers such as `[REDACTED_TOKEN]`, `[REDACTED_CSRF]`, `[REDACTED_API_KEY]`, and `[REDACTED_HOME]`. Do not read configuration, filesystem state, browser state, or environment variables from this module.

- [ ] **Step 3: Run the focused tests**

Run: `pnpm exec vitest run tests/diagnosticRedaction.test.ts --cache=false`
Expected: PASS.

- [ ] **Step 4: Commit the pure contract**

```bash
git add src/lib/diagnosticRedaction.ts tests/diagnosticRedaction.test.ts
git commit -m "feat: add diagnostic redaction primitives"
```

### Task 2: Add opt-in redaction to diagnostic exports

**Files:**
- Modify: `src/app/api/conversations/[source]/[id]/diagnostic/route.ts`
- Modify: `tests/diagnosticRouteCodex.test.ts`

- [ ] **Step 1: Extend route tests**

Add requests with `redact=1` and without the parameter. Assert that the builder is called exactly as before and that only the opt-in response is passed through the redaction function; preserve existing status, filename, and root-id behavior.

- [ ] **Step 2: Implement the route option**

Parse `redact=1`/`true` as opt-in, build the raw export exactly as today, then redact the response value before serialization when requested. Keep raw exports backward-compatible when the parameter is absent. Do not redact the in-memory viewer content or silently alter the diagnostic builder.

- [ ] **Step 3: Run route and type checks**

Run: `pnpm exec vitest run tests/diagnosticRouteCodex.test.ts --cache=false && pnpm exec tsc --noEmit --incremental false`
Expected: PASS.

### Task 3: Add warning-gated raw Inspector and copy controls

**Files:**
- Modify: `src/components/HomeClient.tsx`
- Modify: `tests/projectShellClient.test.ts` or add a focused component test if the existing test harness supports it

- [ ] **Step 1: Add UI tests for the privacy contract**

Assert the diagnostic affordance exposes a visible sensitivity warning and an opt-in redaction control, and that the Inspector has a warning-gated “Show raw values” control. Preserve transcript rendering and existing navigation behavior.

- [ ] **Step 2: Implement local UI state**

Add page-local state for `redactDiagnosticExport`, `showRawInspector`, and `redactInspectorCopies`, all defaulting to false. The export link appends `redact=1` only when selected and labels the raw-data warning clearly. The Inspector keeps stable metadata visible, renders raw text/payload/output/tool-call fields only after the user enables “Show raw values,” and displays the warning before enabling it.

- [ ] **Step 3: Apply redaction only to copy actions**

When `redactInspectorCopies` is enabled, pass copied strings and serialized payloads through `redactDiagnosticValue`; leave displayed values unchanged. Keep copy/download failures silent as they are today and avoid persisting sensitive content in local storage.

- [ ] **Step 4: Run UI and full validation**

Run: `pnpm test -- --run --cache=false`, `pnpm exec tsc --noEmit --incremental false`, `pnpm exec eslint src/components/HomeClient.tsx src/lib/diagnosticRedaction.ts tests/diagnosticRedaction.test.ts tests/diagnosticRouteCodex.test.ts`, and `git diff --check`.

### Task 4: Document and package the change

**Files:**
- Modify: `README.md` or the relevant diagnostics section only if user-facing behavior is not already documented
- Modify: `docs/architecture-review-v1.md` or a focused storage/diagnostics note if needed
- Modify: `CHANGELOG.md` under `## Unreleased`

- [ ] **Step 1: Document the explicit privacy behavior**

State that ordinary transcript display is unchanged, diagnostic exports remain raw by default for compatibility, and users can opt into redaction before export or Inspector copy. Document the raw-value warning and the best-effort pattern scope without claiming complete secret detection.

- [ ] **Step 2: Run final validation and local review**

Run the full test, type, lint, and diff checks; perform the read-only review-agent pass over the complete branch diff and call sites.

- [ ] **Step 3: Commit, push, create PR, and process review**

Commit implementation and documentation separately where practical, push `fix/privacy-redaction-options`, create a PR linked to issue #7, fetch all review threads, classify comments, batch fixes, rerun validation, and merge only after CI and thread state are clean.
