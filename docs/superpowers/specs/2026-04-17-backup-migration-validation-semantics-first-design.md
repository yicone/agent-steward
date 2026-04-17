# Backup / Migration Validation Semantics First

Date: 2026-04-17

## Purpose

Define the first hardening slice after the shipped `Backup / Migration`
expansion line.

This slice does not add new workflows or expand product promises. It narrows on
one job:

- make validation and result semantics more consistent across the existing
  workflow stack

## Scope

This slice covers all shipped `Backup / Migration` workflows:

- `session backup`
- `bulk session backup`
- `import backup`
- `validate package`
- `migration preview`
- `project bundle`

The goal is not to force identical UI between workflows. The goal is to make
their validation and result behavior easier to explain with one coherent set of
rules.

## Primary Goal

Harden the current workflow stack so users can predict:

- when a workflow may continue
- when a condition is a warning rather than a blocker
- when a workflow must stop in an input or validation state
- what a terminal result actually means
- how stale or partial routed context degrades safely

## Included

### 1. Validation status taxonomy

Review and tighten the status language used across workflows so it is possible
to explain their behavior through one stable mental model.

This includes:

- validation readiness before confirmation or execution
- preview-only classification boundaries where they intersect with validation
- terminal success / warning / failure result meaning

### 2. Warning vs blocker boundaries

Align comparable conditions so they do not drift arbitrarily between workflows.

The hardening goal is not “everything behaves identically.” It is:

- similar conditions should have similar severity unless a workflow-specific
  rule justifies the difference

### 3. Routed-context degradation

When routed context is stale, partial, or unresolved, the workflow should
degrade into a safe state instead of preserving misleading continuity.

The expected safe landing zones are:

- selection
- configuration
- validation/input-adjacent state

This slice should reduce cases where users are dropped into a misleading result
or half-valid workflow state.

### 4. Result semantics

Clarify what result states mean across workflows.

A result should answer:

- what completed
- what failed
- what remains unresolved
- whether the outcome is success, success-with-warnings, preview-only, or
  failure
- what next actions are legitimate

### 5. Recent operations alignment

`Recent Operations` should remain a compact memory of completed workflow runs,
not drift into an audit console or alternate control surface.

This slice should align:

- status labels
- summary wording
- reopen behavior
- relationship to the primary result surface

### 6. QA and regression coverage

The hardening work should produce testable state expectations, not only visual
polish.

Expected outcomes include:

- clearer targeted tests
- clearer QA prompts or QA expectations for edge-state verification

## Explicitly Not Included

This slice does not include:

- new workflow types
- migration apply
- restore/runtime continuation promises
- project bundle scope expansion
- privacy-redaction
- broad shell redesign
- generic UI polish unrelated to validation/result semantics
- top-level positioning changes

## Success Criteria

This slice is complete when all of the following are true:

1. The six workflows can be described with a more coherent validation/result
   model.
2. Stale or partial routed context degrades into safe workflow states instead of
   misleading continuity.
3. Result surfaces and `Recent Operations` no longer fight each other
   semantically.
4. QA can verify the hardened rules explicitly instead of relying on subjective
   “feels better” judgment.
5. Any remaining hardening work is clearly separable into a later slice rather
   than left as a vague remainder.

## Completion Rule

This document defines the first cut only.

Completing this slice does not automatically imply that the whole parent
hardening issue is complete.

After this slice lands, re-evaluate whether a meaningful coherent remainder
still exists. If it does, create or narrow a follow-up slice explicitly rather
than continuing under an unbounded “hardening” umbrella.
