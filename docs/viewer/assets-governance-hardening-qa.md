# Assets Governance Hardening QA Report

**Branch**: `feat/context-assets-governance-hardening`  
**PR**: `#74`  
**Date**: 2026-04-19  
**QA Method**: local browser automation against `http://127.0.0.1:3000` using `agent-browser`

## Verdict

**PASS**

I verified the Assets governance hardening flow in a real browser, including the provider-data cue, governance issue counts, selected detail health/provenance/in-effect explanations, route-only actions, compact routed context from Overview, and cue clearing after local focus changes.

## Environment

- Local app: `http://127.0.0.1:3000`
- Server start command: `pnpm exec next dev -H 127.0.0.1 -p 3000`
- Browser runner: `agent-browser`

## What I Verified

- Assets shows the local seed/provider-shaped foundation cue instead of pretending to be a full live scan.
- Governance issue counts are visible and update with filter changes.
- Selected asset detail shows identity, scope, source, status, provenance, governance health, route owner, and in-effect usage explanation.
- Route actions remain bounded to navigation into `Sessions`, `Analysis`, or `Backup / Migration`.
- No inline edit, repair, sync, deploy, restore, validation, confirmation, execution, or result UI appears inside Assets.
- Overview-to-Assets routed context is compact and labeled `from overview`.
- Routed cue clears when local focus changes.

## Findings

### Verified detail behavior

Selected the `Project coding rules` asset by DOM click and confirmed:

- governance health shows `Active and currently in effect`
- route owner is `Sessions`
- provenance is shown as extracted from the current project instruction set
- in-effect/usage explanation is present
- only route actions are exposed

Then selected the `User review preference memory` asset after changing subtype to `Memory` and confirmed:

- governance health explains freshness risk
- route owner is `Sessions`
- the in-effect section says the asset is unavailable instead of inferring active use
- route-only actions remain bounded

### Verified cue clearing

Starting from an overview-routed Assets view, I changed subtype from `Rule` to `Memory` through the DOM. The routed cue strip cleared as expected and the page continued with the new local focus.

## Commands Used

- `pnpm exec next dev -H 127.0.0.1 -p 3000`
- `agent-browser open http://127.0.0.1:3000`
- `agent-browser snapshot -i`
- `agent-browser click @e26`
- `agent-browser eval '(() => { const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Project coding rules")); if (!btn) return "not found"; btn.click(); return btn.textContent; })()'`
- `agent-browser eval '(() => { const select = document.querySelectorAll("select")[0]; if (!select) return "no-select"; select.value = "memory"; select.dispatchEvent(new Event("change", { bubbles: true })); return select.value; })()'`
- `agent-browser eval '(() => { const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("User review preference memory")); if (!btn) return "not found"; btn.click(); return btn.textContent; })()'`

## Browser-Tooling Note

Plain `agent-browser click @e15` was not reliable for the Assets row selection in this run, so I switched to fresh snapshots and direct DOM clicks via `agent-browser eval`. The app behavior itself was correct once the element was clicked directly.

## PR Readiness

No blockers remain for PR `#74` on the verified Assets governance hardening scope.
