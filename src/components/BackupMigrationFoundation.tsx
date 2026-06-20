"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addCompletedRecentOperation,
  buildBulkSessionValidationResult,
  buildMigrationPreviewItems,
  createDefaultProjectBundleSelection,
  buildSessionBackupExecutionRequest,
  canProceedFromValidation,
  createMigrationPreviewOperationResult,
  createProjectBundleOperationResult,
  createBulkOperationSummary,
  createOperationResult,
  dedupeSessionSelections,
  deriveAggregateOperationStatus,
  deriveMigrationPreviewValidationResult,
  deriveValidationResult,
  formatMigrationPreviewClassificationLabel,
  formatMigrationPreviewScopeLabel,
  formatMigrationPreviewSourceKindLabel,
  formatMigrationPreviewSourceProductLabel,
  formatMigrationPreviewTargetProfileLabel,
  getOperationStatusLabel,
  formatWorkflowStateLabel,
  formatWorkflowTypeLabel,
  getBlockedSessionSelections,
  getNextState,
  getPreviousState,
  getStepsForWorkflow,
  getWorkflowDescriptor,
  isTerminalState,
  normalizeBackupId,
  resolveOperationTerminalWorkflowState,
  resolveValidatePackageTerminalState,
  resolveWorkflowFromHandoff,
  resolveRoutedWorkflowState,
  summarizeProjectBundleSelection,
  summarizeSourceCopyConfiguration,
  validateBackupPackageRemote,
  PROJECT_BUNDLE_MEMBER_CATEGORIES,
  PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES,
  WORKFLOW_DESCRIPTORS,
  type BackupSessionSelection,
  type BackupMigrationHandoff,
  type BackupOperationResult,
  type BackupValidationItem,
  type BackupValidationResult,
  type BackupWorkflowState,
  type BackupWorkflowType,
  type BulkSessionExecutionResult,
  type MigrationPreviewScope,
  type MigrationPreviewScopeKind,
  type MigrationPreviewSourceContext,
  type MigrationPreviewSourceKind,
  type MigrationPreviewSourceProduct,
  type MigrationPreviewTargetContext,
  type MigrationPreviewTargetProfile,
  type ProjectBundleConfiguration,
  type ProjectBundleMemberCategory,
  type ProjectBundleMemberInventoryItem,
  type ProjectBundleMemberReference,
  type ProjectBundleSelectableMemberCategory,
  type ProjectBundleSelectionState,
  type ProjectBundleValidationSummary,
  type RecentOperation,
  createValidatePackageOperationResult,
} from "@/lib/backupMigration";
import type { Source } from "@/lib/types";

// ── Props ───────────────────────────────────────────────────────────────────

export type BackupMigrationFoundationProps = {
  handoff: BackupMigrationHandoff | null;
  onNavigateSessions(): void;
  onNavigateOverview(): void;
};

// ── Validation seed helpers ─────────────────────────────────────────────────

function buildSessionBackupValidation(input: {
  sessionId: string | null;
  source: Source | null;
  recoverability?: "ls_readable" | "partial" | "unavailable";
  hasRecoveryEvidence?: boolean;
  recoverabilityNote?: string;
}): BackupValidationItem[] {
  if (!input.sessionId) {
    return [{ id: "v-no-session", label: "No session selected", severity: "block", detail: "Select a session before proceeding." }];
  }

  if (input.source === "windsurf" && input.recoverability === "unavailable") {
    return [
      {
        id: "v-windsurf-unavailable",
        label: "Canonical Cascade content unavailable",
        severity: "block",
        detail:
          input.recoverabilityNote ??
          "The running Windsurf LS no longer has this trajectory, so canonical session backup cannot be generated from readable content.",
      },
      {
        id: "v-windsurf-local-evidence",
        label: "Local source evidence",
        severity: "warning",
        detail: input.hasRecoveryEvidence
          ? "Bounded recovery evidence exists and can be inspected, but it does not replace canonical readable session content."
          : "A local Windsurf session file may still exist, but local discovery alone does not make the session canonically backup-ready.",
      },
    ];
  }

  const recoverabilityWarning =
    input.source === "windsurf" && input.recoverability === "partial"
      ? [
          {
            id: "v-windsurf-partial",
            label: "Partial recovery evidence",
            severity: "warning" as const,
            detail:
              input.recoverabilityNote ??
              "Bounded recovery evidence exists for this Windsurf Cascade session, but it does not imply vendor-runtime restoration or transcript reconstruction.",
          },
        ]
      : [];

  return [
    { id: "v-schema", label: "Schema version", severity: "ok", detail: "session-record/v1 is supported." },
    { id: "v-integrity", label: "Session integrity", severity: "ok", detail: "Session data passes integrity checks." },
    { id: "v-provenance", label: "Provenance", severity: "ok", detail: "Source reference is present and traceable." },
    ...recoverabilityWarning,
  ];
}

function buildImportValidation(backupId: string | null): BackupValidationItem[] {
  if (!backupId) {
    return [{ id: "v-no-pkg", label: "No package selected", severity: "block", detail: "Choose a backup package to import." }];
  }
  return [{ id: "v-await-verify", label: "Ready to verify", severity: "ok", detail: `Backup ${backupId} is ready for verification.` }];
}

function buildValidatePackageValidation(backupId: string | null): BackupValidationItem[] {
  return buildImportValidation(backupId);
}

function deriveInitialPreviewSourceContext(handoff: BackupMigrationHandoff | null): MigrationPreviewSourceContext {
  return handoff?.migrationPreviewSourceContext ?? {};
}

function deriveInitialPreviewTargetContext(handoff: BackupMigrationHandoff | null): MigrationPreviewTargetContext {
  return handoff?.migrationPreviewTargetContext ?? {};
}

function deriveInitialPreviewScope(handoff: BackupMigrationHandoff | null): MigrationPreviewScope {
  return handoff?.migrationPreviewScope ?? { itemRefs: [] };
}

function buildPreviewRepairLabel(target?: string): string {
  if (target === "sessions") return "Inspect source sessions";
  if (target === "assets") return "Inspect source assets";
  if (target === "analysis") return "Review analysis context";
  return "Return to overview context";
}

function isPreviewReadyForResult(input: {
  sourceContext: MigrationPreviewSourceContext;
  targetContext: MigrationPreviewTargetContext;
  scope: MigrationPreviewScope;
}): boolean {
  return Boolean(input.sourceContext.product && input.sourceContext.kind && input.targetContext.profile && input.scope.kind);
}

export function resolveMigrationPreviewInvalidWorkflowState(input: {
  sourceContext: MigrationPreviewSourceContext;
}): BackupWorkflowState {
  return input.sourceContext.product && input.sourceContext.kind ? "configuration" : "selection";
}

function parsePreviewScopeDraft(draft: string): string[] {
  return draft
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOperationStatusBadgeVariant(status: BackupOperationResult["status"]): "default" | "ok" | "warn" {
  if (status === "success" || status === "preview-clear") return "ok";
  if (status === "failed" || status === "preview-with-blockers") return "warn";
  return "default";
}

export function resolveInitialBulkSelections(handoff: BackupMigrationHandoff | null): BackupSessionSelection[] {
  if (!handoff) return [];
  if (handoff.sessions?.length) return dedupeSessionSelections(handoff.sessions);
  if (handoff.workflowType === "bulk-session-backup" && handoff.sessionId) {
    return dedupeSessionSelections([
      {
        sessionId: handoff.sessionId,
        source: handoff.source,
        rootId: handoff.rootId,
      },
    ]);
  }
  return [];
}

export function resolveInitialProjectBundleSessionSelections(handoff: BackupMigrationHandoff | null): BackupSessionSelection[] {
  if (!handoff) return [];
  if (handoff.sessions?.length) return dedupeSessionSelections(handoff.sessions);
  if (handoff.workflowType === "project-bundle" && handoff.sessionId) {
    return dedupeSessionSelections([
      {
        sessionId: handoff.sessionId,
        source: handoff.source,
        rootId: handoff.rootId,
      },
    ]);
  }
  return [];
}

function formatBundleCategoryLabel(category: ProjectBundleMemberCategory): string {
  const labels: Record<ProjectBundleMemberCategory, string> = {
    sessions: "Sessions",
    rules: "Rules",
    memory: "Memory",
    skills: "Skills",
    commands: "Commands",
    "package-metadata": "Package Metadata",
    "project-metadata": "Project Metadata",
  };

  return labels[category];
}

function redactDisplayPath(filePath: string): string {
  return filePath
    .replace(/^\/Users\/[^/]+/, "~")
    .replace(/^\/home\/[^/]+/, "~")
    .replace(/^[A-Za-z]:\\Users\\[^\\]+/, "~");
}

export function buildBulkConfirmationDetails(input: {
  selections: BackupSessionSelection[];
  validationResult: BackupValidationResult | null;
}): {
  selectedCount: number;
  warningCount: number;
  sourceCopySummary: string;
  executionSemantics: string;
} {
  const selections = dedupeSessionSelections(input.selections);
  return {
    selectedCount: selections.length,
    warningCount: input.validationResult?.warningCount ?? input.validationResult?.items.filter((item) => item.severity === "warning").length ?? 0,
    sourceCopySummary: summarizeSourceCopyConfiguration(selections),
    executionSemantics:
      "This workflow executes the existing session-backup behavior once per selected session. It does not create a batch backend API or grouped package format.",
  };
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function CueStrip(props: { handoff: BackupMigrationHandoff }) {
  return (
    <Card className="border-accent/30 bg-accent/8 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">routed workflow</Badge>
            <Badge variant="ok">from {props.handoff.origin}</Badge>
            {props.handoff.preservationWarning ? <Badge variant="warn">preservation</Badge> : null}
          </div>
          <div className="text-sm font-medium">{props.handoff.subtitle}</div>
          {props.handoff.continueLabel ? (
            <div className="text-xs leading-5 text-muted">{props.handoff.continueLabel}</div>
          ) : null}
        </div>
        {props.handoff.returnLabel ? <Badge variant="default">{props.handoff.returnLabel}</Badge> : null}
      </div>
    </Card>
  );
}

function WorkflowStepsIndicator(props: {
  workflowType: BackupWorkflowType;
  currentState: BackupWorkflowState;
}) {
  const steps = getStepsForWorkflow(props.workflowType);
  const currentIndex = steps.indexOf(props.currentState);

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <React.Fragment key={step}>
            {index > 0 ? <span className="text-muted">→</span> : null}
            <span
              className={[
                "rounded-lg px-2 py-1",
                isCurrent ? "bg-accent/20 font-medium text-foreground" : isDone ? "text-muted line-through" : "text-muted",
              ].join(" ")}
            >
              {formatWorkflowStateLabel(step)}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ValidationPanel(props: { result: BackupValidationResult }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted">Validation</div>
        <Badge variant={props.result.status === "valid" ? "ok" : props.result.status === "invalid" ? "warn" : "default"}>
          {props.result.status}
        </Badge>
      </div>
      <div className="space-y-2">
        {props.result.items.map((item) => (
          <div
            key={item.id}
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              item.severity === "block"
                ? "border-red-400/40 bg-red-400/8"
                : item.severity === "warning"
                  ? "border-amber-400/40 bg-amber-400/8"
                  : "border-border/60 bg-background/10",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <Badge variant={item.severity === "ok" ? "ok" : item.severity === "warning" ? "warn" : "default"}>
                {item.severity}
              </Badge>
              <span className="font-medium">{item.label}</span>
            </div>
            <div className="mt-1 text-xs leading-5 text-muted">{item.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OperationResultPanel(props: { result: BackupOperationResult; onNewWorkflow(): void; onReconfigurePreview?(): void }) {
  const hasSessionResults = (props.result.sessionResults?.length ?? 0) > 0;
  const hasPreviewItems = (props.result.previewItems?.length ?? 0) > 0;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted">Operation Result</div>
        <Badge variant={getOperationStatusBadgeVariant(props.result.status)}>
          {getOperationStatusLabel(props.result)}
        </Badge>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
          <div className="font-medium">{formatWorkflowTypeLabel(props.result.workflowType)}</div>
          <div className="mt-1 text-muted">{props.result.summary}</div>
          {props.result.backupId ? (
            <div className="mt-2 text-xs text-muted">Backup ID: {props.result.backupId}</div>
          ) : null}
          {props.result.packageId ? (
            <div className="mt-2 text-xs text-muted">Package ID: {props.result.packageId}</div>
          ) : null}
          {props.result.filePath ? (
            <div className="mt-1 text-xs text-muted">File: {redactDisplayPath(props.result.filePath)}</div>
          ) : null}
          {props.result.sessionCount != null ? (
            <div className="text-xs text-muted">Sessions: {props.result.sessionCount}</div>
          ) : null}
          {props.result.memberCount != null ? (
            <div className="text-xs text-muted">Members: {props.result.memberCount}</div>
          ) : null}
          <div className="text-xs text-muted">Completed: {props.result.timestamp}</div>
        </div>
        {props.result.warnings?.length ? (
          <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Warnings</div>
            {props.result.warnings.map((warning, index) => (
              <div key={index} className="mt-1 text-xs leading-5">{warning}</div>
            ))}
          </div>
        ) : null}
        {props.result.sourceCopySummary ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Source-copy configuration</div>
            <div className="mt-1 text-xs leading-5">{props.result.sourceCopySummary}</div>
          </div>
        ) : null}
        {props.result.workflowType === "project-bundle" && props.result.projectBundleValidationSummary ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
              <div className="text-xs text-muted">Warnings</div>
              <div className="mt-1 font-medium">{props.result.projectBundleValidationSummary.warningCount}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
              <div className="text-xs text-muted">Blockers at validation</div>
              <div className="mt-1 font-medium">{props.result.projectBundleValidationSummary.blockerCount}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
              <div className="text-xs text-muted">Selected categories</div>
              <div className="mt-1 font-medium">{props.result.projectBundleValidationSummary.selectedCategoryCount}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
              <div className="text-xs text-muted">Unresolved refs</div>
              <div className="mt-1 font-medium">{props.result.projectBundleValidationSummary.unresolvedReferenceCount}</div>
            </div>
          </div>
        ) : null}
        {props.result.workflowType === "project-bundle" && (props.result.projectBundleMemberInventory?.length ?? 0) > 0 ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Bundle member inventory</div>
            <div className="mt-3 space-y-2">
              {props.result.projectBundleMemberInventory!.map((item) => (
                <div key={item.category} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatBundleCategoryLabel(item.category)}</span>
                    <Badge variant={item.status === "ready" ? "ok" : item.status === "warning" ? "warn" : "default"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs leading-5">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {props.result.workflowType === "project-bundle" && (props.result.projectBundleMemberReferences?.length ?? 0) > 0 ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Member references</div>
            <div className="mt-3 space-y-2">
              {props.result.projectBundleMemberReferences!.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant={item.status === "resolved" ? "ok" : "warn"}>{item.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs leading-5">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {props.result.workflowType === "migration-preview" ? (
          <div className="rounded-xl border border-accent/35 bg-accent/8 px-3 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">Preview only.</span>{" "}
            This result compares explicit source, target, and bounded scope without applying migration, generating bundles, or writing migrated objects.
          </div>
        ) : null}
        {props.result.previewCounts ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(["portable", "degraded", "unsupported", "blocked"] as const).map((classification) => (
              <div key={classification} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                <div className="text-xs text-muted">{formatMigrationPreviewClassificationLabel(classification)}</div>
                <div className="mt-1 font-medium">{props.result.previewCounts?.[classification] ?? 0}</div>
              </div>
            ))}
          </div>
        ) : null}
        {props.result.previewSourceContext || props.result.previewTargetContext || props.result.previewScope ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Preview context</div>
            {props.result.previewSourceContext?.product && props.result.previewSourceContext.kind ? (
              <div className="mt-1 text-xs leading-5">
                Source: {formatMigrationPreviewSourceProductLabel(props.result.previewSourceContext.product)} / {formatMigrationPreviewSourceKindLabel(props.result.previewSourceContext.kind)}
              </div>
            ) : null}
            {props.result.previewTargetContext?.profile ? (
              <div className="mt-1 text-xs leading-5">Target: {formatMigrationPreviewTargetProfileLabel(props.result.previewTargetContext.profile)}</div>
            ) : null}
            {props.result.previewScope?.kind ? (
              <div className="mt-1 text-xs leading-5">
                Scope: {formatMigrationPreviewScopeLabel(props.result.previewScope.kind)} ({props.result.previewScope.itemRefs.length})
              </div>
            ) : null}
          </div>
        ) : null}
        {hasSessionResults ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Per-session results</div>
            <div className="mt-3 space-y-2">
              {props.result.sessionResults!.map((sessionResult) => (
                <div key={`${sessionResult.sessionId}:${sessionResult.rootId ?? "no-root"}`} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={sessionResult.status === "success" ? "ok" : sessionResult.status === "failed" ? "warn" : "default"}>
                        {sessionResult.status}
                      </Badge>
                      <span className="font-medium">{sessionResult.sessionId}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {sessionResult.source ?? "unknown-source"}
                      {sessionResult.rootId ? ` / ${sessionResult.rootId}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 text-xs leading-5">{sessionResult.summary}</div>
                  {sessionResult.backupId ? <div className="mt-1 text-xs">Backup ID: {sessionResult.backupId}</div> : null}
                  {sessionResult.error ? <div className="mt-1 text-xs text-foreground">Error: {sessionResult.error}</div> : null}
                  {sessionResult.warnings?.length ? (
                    <div className="mt-1 space-y-1 text-xs leading-5">
                      {sessionResult.warnings.map((warning, index) => (
                        <div key={index}>{warning}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {props.result.workflowType === "migration-preview" && props.result.previewScope?.kind && !hasPreviewItems ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/8 px-3 py-3 text-sm text-muted">
            No previewable {formatMigrationPreviewScopeLabel(props.result.previewScope.kind).toLowerCase()} were available. Return to scope configuration to refine the bounded preview set.
          </div>
        ) : null}
        {hasPreviewItems ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <div className="font-medium text-foreground">Preview item detail</div>
            <div className="mt-3 space-y-2">
              {props.result.previewItems!.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.classification === "portable" ? "ok" : item.classification === "degraded" ? "default" : "warn"}>
                        {item.classification}
                      </Badge>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted">{formatMigrationPreviewScopeLabel(item.scopeKind)}</span>
                  </div>
                  <div className="mt-1 text-xs leading-5">{item.detail}</div>
                  {item.classification !== "portable" ? (
                    <div className="mt-1 text-xs text-muted">{buildPreviewRepairLabel(item.repairTarget)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {props.result.workflowType === "migration-preview" ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">No runtime restore or apply.</span>{" "}
            Preview results are advisory compatibility findings only. They do not write objects, reopen third-party runtimes, or create backup packages.
          </div>
        ) : props.result.workflowType === "project-bundle" ? (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">No restore or apply in foundation v1.</span>{" "}
            The generated project bundle is a portable local package only. It does not promise vendor-runtime reopen, cloud sync, app snapshot, or team collaboration semantics.
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">No vendor-runtime restore.</span>{" "}
            Imported or backed-up sessions are product-readable only. They will not reopen inside a third-party agent runtime or private source store.
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {props.result.workflowType === "migration-preview" && props.onReconfigurePreview ? (
          <Button size="sm" variant="outline" onClick={props.onReconfigurePreview}>
            Return to scope configuration
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={props.onNewWorkflow}>
          Start another workflow
        </Button>
      </div>
    </Card>
  );
}

function RecentOperationsPanel(props: { operations: RecentOperation[]; onSelectOperation(op: RecentOperation): void }) {
  if (props.operations.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Recent Operations</div>
      <div className="space-y-2">
        {props.operations.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => props.onSelectOperation(op)}
            className="w-full rounded-xl border border-border/60 bg-background/10 px-3 py-2 text-left text-sm transition-colors hover:border-accent/35"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={getOperationStatusBadgeVariant(op.status)}>
                  {getOperationStatusLabel(op)}
                </Badge>
                <span className="font-medium">{formatWorkflowTypeLabel(op.workflowType)}</span>
              </div>
              <span className="text-xs text-muted">{new Date(op.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="mt-1 text-xs text-muted">{op.summary}</div>
            {op.sessionCount != null ? <div className="mt-1 text-[11px] text-muted">Sessions: {op.sessionCount}</div> : null}
            {op.packageId ? <div className="mt-1 text-[11px] text-muted">Package: {op.packageId}</div> : null}
            {op.memberCount != null ? <div className="mt-1 text-[11px] text-muted">Members: {op.memberCount}</div> : null}
            {op.workflowType === "migration-preview" && op.previewScope?.kind ? (
              <div className="mt-1 text-[11px] text-muted">
                Scope: {formatMigrationPreviewScopeLabel(op.previewScope.kind)} ({op.previewScope.itemRefs.length})
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function BackupMigrationFoundation({
  handoff,
  onNavigateSessions,
  onNavigateOverview,
}: BackupMigrationFoundationProps) {
  // ── State ──
  const initialWorkflow = resolveWorkflowFromHandoff(handoff);
  const [activeWorkflow, setActiveWorkflow] = useState<BackupWorkflowType | null>(initialWorkflow);
  const [workflowState, setWorkflowState] = useState<BackupWorkflowState>(
    initialWorkflow ? resolveRoutedWorkflowState(initialWorkflow, handoff) : "idle"
  );
  const [activeHandoff, setActiveHandoff] = useState<BackupMigrationHandoff | null>(handoff);

  // Session backup state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(handoff?.sessionId ?? null);
  const [selectedSource, setSelectedSource] = useState<Source | null>((handoff?.source as Source) ?? null);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(handoff?.rootId ?? null);
  const [selectedRecoverability, setSelectedRecoverability] = useState<BackupMigrationHandoff["recoverability"]>(handoff?.recoverability);
  const [selectedHasRecoveryEvidence, setSelectedHasRecoveryEvidence] = useState<boolean>(handoff?.hasRecoveryEvidence === true);
  const [selectedRecoverabilityNote, setSelectedRecoverabilityNote] = useState<string | null>(handoff?.recoverabilityNote ?? null);
  const [includeSourceCopy, setIncludeSourceCopy] = useState(false);

  // Bulk session backup state
  const [bulkSelections, setBulkSelections] = useState<BackupSessionSelection[]>(() => resolveInitialBulkSelections(handoff));
  const [bulkDraftSessionId, setBulkDraftSessionId] = useState("");
  const [bulkDraftSource, setBulkDraftSource] = useState<Source | "">("");
  const [bulkDraftRootId, setBulkDraftRootId] = useState("");

  // Import / validate state
  const [backupIdInput, setBackupIdInput] = useState("");

  // Migration preview state
  const [previewSourceContext, setPreviewSourceContext] = useState<MigrationPreviewSourceContext>(() => deriveInitialPreviewSourceContext(handoff));
  const [previewTargetContext, setPreviewTargetContext] = useState<MigrationPreviewTargetContext>(() => deriveInitialPreviewTargetContext(handoff));
  const [previewScope, setPreviewScope] = useState<MigrationPreviewScope>(() => deriveInitialPreviewScope(handoff));
  const [previewScopeDraft, setPreviewScopeDraft] = useState(deriveInitialPreviewScope(handoff).itemRefs.join("\n"));

  // Project bundle state
  const [projectBundleSelection, setProjectBundleSelection] = useState<ProjectBundleSelectionState>(() =>
    createDefaultProjectBundleSelection(handoff, resolveInitialProjectBundleSessionSelections(handoff))
  );
  const [bundleDraftSessionId, setBundleDraftSessionId] = useState("");
  const [bundleDraftSource, setBundleDraftSource] = useState<Source | "">("");
  const [bundleDraftRootId, setBundleDraftRootId] = useState("");
  const [bundleConfig, setBundleConfig] = useState<ProjectBundleConfiguration>({
    bundleName: "Current project context bundle",
    notes: "",
  });
  const [projectBundleValidationSummary, setProjectBundleValidationSummary] = useState<ProjectBundleValidationSummary | null>(null);
  const [projectBundleMemberInventory, setProjectBundleMemberInventory] = useState<ProjectBundleMemberInventoryItem[]>([]);
  const [projectBundleMemberReferences, setProjectBundleMemberReferences] = useState<ProjectBundleMemberReference[]>([]);

  // Validation
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);

  // Execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Result
  const [operationResult, setOperationResult] = useState<BackupOperationResult | null>(null);
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([]);

  // ── Derived ──
  const descriptor = activeWorkflow ? getWorkflowDescriptor(activeWorkflow) : null;
  const normalizedBackupId = normalizeBackupId(backupIdInput);
  const dedupedBulkSelections = useMemo(() => dedupeSessionSelections(bulkSelections), [bulkSelections]);
  const hasSelectedProjectBundleCategories = useMemo(
    () =>
      PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES.some(
        (category) => projectBundleSelection.includedCategories[category]
      ),
    [projectBundleSelection]
  );
  const bulkConfirmationDetails = useMemo(
    () => buildBulkConfirmationDetails({ selections: dedupedBulkSelections, validationResult }),
    [dedupedBulkSelections, validationResult]
  );

  const commitCompletedOperation = useCallback((result: BackupOperationResult, nextState: Extract<BackupWorkflowState, "result" | "failed">) => {
    setOperationResult(result);
    setRecentOperations((prev) => addCompletedRecentOperation(prev, result, nextState));
    setWorkflowState(nextState);
  }, []);

  // ── Actions ──
  const resetWorkflow = useCallback(() => {
    setActiveWorkflow(null);
    setWorkflowState("idle");
    setActiveHandoff(null);
    setSelectedSessionId(null);
    setSelectedSource(null);
    setSelectedRootId(null);
    setSelectedRecoverability(undefined);
    setSelectedHasRecoveryEvidence(false);
    setSelectedRecoverabilityNote(null);
    setIncludeSourceCopy(false);
    setBulkSelections([]);
    setBulkDraftSessionId("");
    setBulkDraftSource("");
    setBulkDraftRootId("");
    setBackupIdInput("");
    setPreviewSourceContext({});
    setPreviewTargetContext({});
    setPreviewScope({ itemRefs: [] });
    setPreviewScopeDraft("");
    setProjectBundleSelection(createDefaultProjectBundleSelection(null, []));
    setBundleDraftSessionId("");
    setBundleDraftSource("");
    setBundleDraftRootId("");
    setBundleConfig({
      bundleName: "Current project context bundle",
      notes: "",
    });
    setProjectBundleValidationSummary(null);
    setProjectBundleMemberInventory([]);
    setProjectBundleMemberReferences([]);
    setValidationResult(null);
    setIsExecuting(false);
    setExecutionError(null);
    setOperationResult(null);
  }, []);

  const selectWorkflow = useCallback((type: BackupWorkflowType) => {
    setActiveWorkflow(type);
    setWorkflowState("selection");
    setValidationResult(null);
    setOperationResult(null);
    setExecutionError(null);
    setIsExecuting(false);
    if (type === "bulk-session-backup") {
      setBulkSelections(resolveInitialBulkSelections(activeHandoff));
    }
    if (type === "migration-preview") {
      const initialSource = deriveInitialPreviewSourceContext(activeHandoff);
      const initialTarget = deriveInitialPreviewTargetContext(activeHandoff);
      const initialScope = deriveInitialPreviewScope(activeHandoff);
      setPreviewSourceContext(initialSource);
      setPreviewTargetContext(initialTarget);
      setPreviewScope(initialScope);
      setPreviewScopeDraft(initialScope.itemRefs.join("\n"));
    }
    if (type === "project-bundle") {
      setProjectBundleSelection(createDefaultProjectBundleSelection(activeHandoff, resolveInitialProjectBundleSessionSelections(activeHandoff)));
      setBundleConfig({
        bundleName: "Current project context bundle",
        notes: activeHandoff?.subtitle ?? "",
      });
      setProjectBundleValidationSummary(null);
      setProjectBundleMemberInventory([]);
      setProjectBundleMemberReferences([]);
    }
  }, [activeHandoff]);

  const advanceState = useCallback(() => {
    if (!activeWorkflow) return;
    const next = getNextState(activeWorkflow, workflowState);
    if (next) setWorkflowState(next);
  }, [activeWorkflow, workflowState]);

  const retreatState = useCallback(() => {
    if (!activeWorkflow) return;
    const prev = getPreviousState(activeWorkflow, workflowState);
    if (prev) {
      setWorkflowState(prev);
      setValidationResult(null);
      setExecutionError(null);
    }
  }, [activeWorkflow, workflowState]);

  const runValidation = useCallback(async () => {
    if (!activeWorkflow) return;
    if (activeWorkflow === "session-backup") {
      const result = deriveValidationResult(buildSessionBackupValidation({
        sessionId: selectedSessionId,
        source: selectedSource,
        recoverability: selectedRecoverability,
        hasRecoveryEvidence: selectedHasRecoveryEvidence,
        recoverabilityNote: selectedRecoverabilityNote ?? undefined,
      }));
      setValidationResult(result);
      setWorkflowState("validation");
      return;
    }

    if (activeWorkflow === "bulk-session-backup") {
      const result = buildBulkSessionValidationResult(dedupedBulkSelections);
      setValidationResult(result);
      setWorkflowState("validation");
      return;
    }

    if (activeWorkflow === "migration-preview") {
      const nextScope: MigrationPreviewScope = {
        ...previewScope,
        itemRefs: parsePreviewScopeDraft(previewScopeDraft),
      };
      setPreviewScope(nextScope);
      const result = deriveMigrationPreviewValidationResult({
        sourceContext: previewSourceContext,
        targetContext: previewTargetContext,
        scope: nextScope,
      });
      setValidationResult(result);
      if (result.status === "invalid") {
        setWorkflowState(resolveMigrationPreviewInvalidWorkflowState({ sourceContext: previewSourceContext }));
        return;
      }
      setWorkflowState("validation");
      return;
    }

    if (activeWorkflow === "project-bundle") {
      const response = await fetch("/api/project-bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "validate",
          handoff: activeHandoff,
          selection: projectBundleSelection,
          configuration: bundleConfig,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        const result = deriveValidationResult([
          {
            id: "bundle-validation-request-failed",
            label: "Bundle validation",
            severity: "block",
            detail: payload?.error ?? `Bundle validation failed with HTTP ${response.status}.`,
          },
        ]);
        setValidationResult(result);
        setProjectBundleValidationSummary(null);
        setProjectBundleMemberInventory([]);
        setProjectBundleMemberReferences([]);
        setWorkflowState("validation");
        return;
      }
      setValidationResult(payload.validation);
      setProjectBundleValidationSummary(payload.summary);
      setProjectBundleMemberInventory(payload.memberInventory ?? []);
      setProjectBundleMemberReferences(payload.memberReferences ?? []);
      setWorkflowState("validation");
      return;
    }

    let items: BackupValidationItem[];
    if (!normalizedBackupId) {
      items = activeWorkflow === "import-backup"
        ? buildImportValidation(null)
        : buildValidatePackageValidation(null);
    } else {
      items = await validateBackupPackageRemote(fetch, normalizedBackupId);
    }
    const result = deriveValidationResult(items);
    setValidationResult(result);
    setWorkflowState("validation");
  }, [
    activeHandoff,
    activeWorkflow,
    bundleConfig,
    dedupedBulkSelections,
    normalizedBackupId,
    previewScope,
    previewScopeDraft,
    previewSourceContext,
    previewTargetContext,
    projectBundleSelection,
    selectedHasRecoveryEvidence,
    selectedRecoverability,
    selectedRecoverabilityNote,
    selectedSessionId,
    selectedSource,
  ]);

  const addBulkSelection = useCallback(() => {
    if (!bulkDraftSessionId.trim() || !bulkDraftSource) return;
    setBulkSelections((prev) =>
      dedupeSessionSelections([
        ...prev,
        {
          sessionId: bulkDraftSessionId,
          source: bulkDraftSource,
          rootId: bulkDraftRootId || undefined,
        },
      ])
    );
    setBulkDraftSessionId("");
    setBulkDraftSource("");
    setBulkDraftRootId("");
  }, [bulkDraftRootId, bulkDraftSessionId, bulkDraftSource]);

  const toggleProjectBundleCategory = useCallback((category: ProjectBundleSelectableMemberCategory, selected: boolean) => {
    setProjectBundleSelection((prev) => ({
      ...prev,
      includedCategories: {
        ...prev.includedCategories,
        [category]: selected,
      },
    }));
  }, []);

  const addProjectBundleSession = useCallback(() => {
    if (!bundleDraftSessionId.trim() || !bundleDraftSource) return;
    setProjectBundleSelection((prev) => ({
      ...prev,
      sessionSelections: dedupeSessionSelections([
        ...prev.sessionSelections,
        {
          sessionId: bundleDraftSessionId,
          source: bundleDraftSource,
          rootId: bundleDraftRootId || undefined,
        },
      ]),
    }));
    setBundleDraftSessionId("");
    setBundleDraftSource("");
    setBundleDraftRootId("");
  }, [bundleDraftRootId, bundleDraftSessionId, bundleDraftSource]);

  const removeProjectBundleSession = useCallback((selection: BackupSessionSelection) => {
    const target = `${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`;
    setProjectBundleSelection((prev) => ({
      ...prev,
      sessionSelections: prev.sessionSelections.filter(
        (item) => `${item.sessionId}:${item.source ?? ""}:${item.rootId ?? ""}` !== target
      ),
    }));
  }, []);

  const removeBulkSelection = useCallback((selection: BackupSessionSelection) => {
    const target = `${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`;
    setBulkSelections((prev) =>
      prev.filter((item) => `${item.sessionId}:${item.source ?? ""}:${item.rootId ?? ""}` !== target)
    );
  }, []);

  const updateBulkSelectionSourceCopy = useCallback((selection: BackupSessionSelection, includeSourceCopy: boolean) => {
    const target = `${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`;
    setBulkSelections((prev) =>
      prev.map((item) =>
        `${item.sessionId}:${item.source ?? ""}:${item.rootId ?? ""}` === target
          ? { ...item, includeSourceCopy }
          : item
      )
    );
  }, []);

  const removeBlockedSelections = useCallback(() => {
    if (!validationResult) return;
    const blocked = new Set(getBlockedSessionSelections(validationResult).map((selection) => `${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`));
    setBulkSelections((prev) => prev.filter((selection) => !blocked.has(`${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`)));
    setValidationResult(null);
    setWorkflowState("selection");
  }, [validationResult]);

  const executeSessionBackup = useCallback(async () => {
    if (!selectedSessionId || !selectedSource) return;
    setIsExecuting(true);
    setExecutionError(null);
    setWorkflowState("execution");

    try {
      const requestBody = buildSessionBackupExecutionRequest({
        source: selectedSource,
        sessionId: selectedSessionId,
        rootId: selectedRootId,
        includeSourceCopy,
      });

      const response = await fetch("/api/session-backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = createOperationResult({
        workflowType: "session-backup",
        status: "success",
        summary: `Session ${selectedSessionId} backed up successfully.`,
        backupId: data.backupId,
        sessionCount: 1,
      });
      commitCompletedOperation(result, "result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionError(message);
      const result = createOperationResult({
        workflowType: "session-backup",
        status: "failed",
        summary: `Session backup failed: ${message}`,
      });
      commitCompletedOperation(result, "failed");
    } finally {
      setIsExecuting(false);
    }
  }, [commitCompletedOperation, includeSourceCopy, selectedRootId, selectedSessionId, selectedSource]);

  const executeBulkSessionBackup = useCallback(async () => {
    if (dedupedBulkSelections.length === 0) return;

    setIsExecuting(true);
    setExecutionError(null);
    setWorkflowState("execution");

    const validationWarningsBySelection = new Map<string, string[]>();
    for (const entry of validationResult?.sessionResults ?? []) {
      validationWarningsBySelection.set(
        `${entry.session.sessionId}:${entry.session.source ?? ""}:${entry.session.rootId ?? ""}`,
        entry.result.items.filter((item) => item.severity === "warning").map((item) => item.detail)
      );
    }

    try {
      const sessionResults: BulkSessionExecutionResult[] = [];

      for (const selection of dedupedBulkSelections) {
        const warningKey = `${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`;
        const validationWarnings = validationWarningsBySelection.get(warningKey) ?? [];

        if (!selection.sessionId || !selection.source) {
          sessionResults.push({
            sessionId: selection.sessionId || "unresolved-session",
            source: selection.source,
            rootId: selection.rootId,
            status: "failed",
            summary: "Selected session cannot be backed up because canonical identity or provenance is missing.",
            error: "Missing canonical session ID or source provenance.",
          });
          continue;
        }

        try {
          const requestBody = buildSessionBackupExecutionRequest({
            source: selection.source,
            sessionId: selection.sessionId,
            rootId: selection.rootId,
            includeSourceCopy: selection.includeSourceCopy === true,
          });

          const response = await fetch("/api/session-backups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(errorData.error ?? `HTTP ${response.status}`);
          }

          const data = await response.json();
          sessionResults.push({
            sessionId: selection.sessionId,
            source: selection.source,
            rootId: selection.rootId,
            status: validationWarnings.length ? "success-with-warnings" : "success",
            summary: `Session ${selection.sessionId} backed up successfully.`,
            backupId: data.backupId,
            warnings: validationWarnings.length ? validationWarnings : undefined,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sessionResults.push({
            sessionId: selection.sessionId,
            source: selection.source,
            rootId: selection.rootId,
            status: "failed",
            summary: `Session ${selection.sessionId} backup failed.`,
            warnings: validationWarnings.length ? validationWarnings : undefined,
            error: message,
          });
        }
      }

      const aggregateStatus = deriveAggregateOperationStatus(sessionResults);
      const result = createOperationResult({
        workflowType: "bulk-session-backup",
        status: aggregateStatus,
        summary: createBulkOperationSummary(sessionResults),
        sessionCount: sessionResults.length,
        sourceCopySummary: summarizeSourceCopyConfiguration(dedupedBulkSelections),
        warnings: sessionResults.flatMap((entry) => entry.warnings ?? []),
        sessionResults,
      });

      commitCompletedOperation(result, aggregateStatus === "failed" ? "failed" : "result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionError(message);
      const result = createOperationResult({
        workflowType: "bulk-session-backup",
        status: "failed",
        summary: `Bulk session backup failed: ${message}`,
        sessionCount: dedupedBulkSelections.length,
        sourceCopySummary: summarizeSourceCopyConfiguration(dedupedBulkSelections),
      });
      commitCompletedOperation(result, "failed");
    } finally {
      setIsExecuting(false);
    }
  }, [commitCompletedOperation, dedupedBulkSelections, validationResult]);

  const executeImport = useCallback(async () => {
    if (!normalizedBackupId) return;
    setIsExecuting(true);
    setExecutionError(null);
    setWorkflowState("execution");

    try {
      const response = await fetch("/api/session-backups/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId: normalizedBackupId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as {
          error?: string;
          title?: string;
          hint?: string;
          code?: string;
        };
        const detail = errorData.title
          ? `${errorData.title}: ${errorData.error ?? `HTTP ${response.status}`}`
          : errorData.error ?? `HTTP ${response.status}`;
        const hint = errorData.hint ? ` Hint: ${errorData.hint}` : "";
        const code = errorData.code ? ` (${errorData.code})` : "";
        throw new Error(`${detail}${code}${hint}`);
      }

      const data = await response.json();
      const result = createOperationResult({
        workflowType: "import-backup",
        status: "success",
        summary: `Backup ${normalizedBackupId} imported successfully.`,
        backupId: data.backupId,
        sessionCount: data.sessions?.length,
        warnings: ["Import restores product-readable state only. Sessions will not reopen inside a third-party agent runtime."],
      });
      commitCompletedOperation(result, "result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionError(message);
      const result = createOperationResult({
        workflowType: "import-backup",
        status: "failed",
        summary: `Import failed: ${message}`,
      });
      commitCompletedOperation(result, "failed");
    } finally {
      setIsExecuting(false);
    }
  }, [commitCompletedOperation, normalizedBackupId]);

  const executeProjectBundle = useCallback(async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setWorkflowState("execution");

    try {
      const response = await fetch("/api/project-bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          handoff: activeHandoff,
          selection: projectBundleSelection,
          configuration: bundleConfig,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      setProjectBundleValidationSummary(payload.summary);
      setProjectBundleMemberInventory(payload.memberInventory ?? []);
      setProjectBundleMemberReferences(payload.memberReferences ?? []);
      const warnings = (payload.validation?.items ?? [])
        .filter((item: BackupValidationItem) => item.severity === "warning")
        .map((item: BackupValidationItem) => item.detail);

      const result = createProjectBundleOperationResult({
        status: warnings.length ? "success-with-warnings" : "success",
        packageId: payload.packageId,
        filePath: payload.filePath,
        summary: `Project bundle ${payload.packageId} generated with ${payload.memberReferences?.length ?? 0} member references.`,
        validationSummary: payload.summary,
        memberInventory: payload.memberInventory ?? [],
        memberReferences: payload.memberReferences ?? [],
        warnings,
      });

      commitCompletedOperation(result, "result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionError(message);
      const result = createOperationResult({
        workflowType: "project-bundle",
        status: "failed",
        summary: `Project bundle generation failed: ${message}`,
      });
      commitCompletedOperation(result, "failed");
    } finally {
      setIsExecuting(false);
    }
  }, [activeHandoff, bundleConfig, commitCompletedOperation, projectBundleSelection]);

  const finishValidateOnly = useCallback(() => {
    if (!validationResult) return;
    commitCompletedOperation(createValidatePackageOperationResult(validationResult), resolveValidatePackageTerminalState(validationResult));
  }, [commitCompletedOperation, validationResult]);

  const finishMigrationPreview = useCallback(() => {
    const nextScope: MigrationPreviewScope = {
      ...previewScope,
      itemRefs: parsePreviewScopeDraft(previewScopeDraft),
    };
    setPreviewScope(nextScope);

    const items =
      previewSourceContext.product && previewSourceContext.kind && previewTargetContext.profile && nextScope.kind
        ? buildMigrationPreviewItems({
            sourceContext: previewSourceContext,
            targetContext: previewTargetContext,
            scope: nextScope,
          })
        : [];

    const result = createMigrationPreviewOperationResult({
      sourceContext: previewSourceContext,
      targetContext: previewTargetContext,
      scope: nextScope,
      items,
      issueLabel: activeHandoff?.issueLabel,
    });
    commitCompletedOperation(result, "result");
  }, [activeHandoff?.issueLabel, commitCompletedOperation, previewScope, previewScopeDraft, previewSourceContext, previewTargetContext]);

  const handleSelectRecentOperation = useCallback((op: RecentOperation) => {
    setOperationResult(op);
    setActiveWorkflow(op.workflowType);
    if (op.workflowType === "migration-preview") {
      setPreviewSourceContext(op.previewSourceContext ?? {});
      setPreviewTargetContext(op.previewTargetContext ?? {});
      setPreviewScope(op.previewScope ?? { itemRefs: [] });
      setPreviewScopeDraft((op.previewScope?.itemRefs ?? []).join("\n"));
    }
    if (op.workflowType === "project-bundle") {
      setProjectBundleValidationSummary(op.projectBundleValidationSummary ?? null);
      setProjectBundleMemberInventory(op.projectBundleMemberInventory ?? []);
      setProjectBundleMemberReferences(op.projectBundleMemberReferences ?? []);
    }
    setWorkflowState(resolveOperationTerminalWorkflowState(op));
  }, []);

  const reopenMigrationPreviewConfiguration = useCallback(() => {
    if (activeWorkflow !== "migration-preview") return;
    setOperationResult(null);
    setValidationResult(null);
    setWorkflowState("configuration");
  }, [activeWorkflow]);

  // ── Auto-prefill from handoff ──
  const prefillSessionId = useMemo(() => handoff?.sessionId ?? null, [handoff]);

  useEffect(() => {
    if (selectedSource !== "codex" && includeSourceCopy) {
      setIncludeSourceCopy(false);
    }
  }, [includeSourceCopy, selectedSource]);

  // ── Render: idle ──
  if (workflowState === "idle" && !activeWorkflow) {
    return (
      <div className="space-y-4">
        {activeHandoff ? <CueStrip handoff={activeHandoff} /> : null}

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">workflow-first</Badge>
              <Badge variant="ok">local-first</Badge>
            </div>
            <h2 className="text-xl font-semibold">Backup / Migration</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted">
              Choose a bounded workflow below. Each workflow follows explicit selection, validation, and result steps.
              This foundation does not support migration apply, vendor-runtime restore, or cloud sync.
            </p>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {WORKFLOW_DESCRIPTORS.map((descriptor) => (
            <Card key={descriptor.type} className="p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted">{descriptor.label}</div>
              <p className="mt-2 text-sm leading-6 text-muted">{descriptor.description}</p>
              <Button className="mt-4" size="sm" onClick={() => selectWorkflow(descriptor.type)}>
                Start {descriptor.label}
              </Button>
            </Card>
          ))}
        </div>

        <RecentOperationsPanel operations={recentOperations} onSelectOperation={handleSelectRecentOperation} />
      </div>
    );
  }

  // ── Render: result / failed ──
  if (operationResult && isTerminalState(workflowState)) {
    return (
      <div className="space-y-4">
        {activeHandoff ? <CueStrip handoff={activeHandoff} /> : null}

        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default">{descriptor?.label ?? "Workflow"}</Badge>
                <Badge variant={workflowState === "failed" ? "warn" : "ok"}>{formatWorkflowStateLabel(workflowState)}</Badge>
              </div>
              <h2 className="text-xl font-semibold">Backup / Migration</h2>
            </div>
          </div>
        </Card>

        <OperationResultPanel result={operationResult} onNewWorkflow={resetWorkflow} onReconfigurePreview={reopenMigrationPreviewConfiguration} />

        <RecentOperationsPanel operations={recentOperations} onSelectOperation={handleSelectRecentOperation} />
      </div>
    );
  }

  // ── Render: active workflow ──
  return (
    <div className="space-y-4">
      {activeHandoff ? <CueStrip handoff={activeHandoff} /> : null}

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default">{descriptor?.label ?? "Workflow"}</Badge>
              <Badge variant="ok">{formatWorkflowStateLabel(workflowState)}</Badge>
              {isExecuting ? <Badge variant="warn">executing…</Badge> : null}
            </div>
            <h2 className="text-xl font-semibold">Backup / Migration</h2>
          </div>
          <Button size="sm" variant="outline" onClick={resetWorkflow}>
            Cancel
          </Button>
        </div>
        {activeWorkflow ? (
          <div className="mt-3">
            <WorkflowStepsIndicator workflowType={activeWorkflow} currentState={workflowState} />
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <div className="space-y-4">
          {/* Selection / intake */}
          {workflowState === "selection" && activeWorkflow === "session-backup" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Select Session</div>
              <div className="space-y-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Session ID</span>
                  <input
                    type="text"
                    value={selectedSessionId ?? ""}
                    onChange={(e) => setSelectedSessionId(e.target.value || null)}
                    placeholder="Enter session ID"
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Source</span>
                  <select
                    value={selectedSource ?? ""}
                    onChange={(e) => setSelectedSource((e.target.value as Source) || null)}
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  >
                    <option value="">Choose source</option>
                    <option value="antigravity">Antigravity</option>
                    <option value="windsurf">Windsurf</option>
                    <option value="codex">Codex</option>
                    <option value="cursor">Cursor</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Root ID (optional)</span>
                  <input
                    type="text"
                    value={selectedRootId ?? ""}
                    onChange={(e) => setSelectedRootId(e.target.value || null)}
                    placeholder="Optional root ID"
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                {prefillSessionId ? (
                  <div className="text-xs text-muted">Pre-filled from routed handoff.</div>
                ) : null}
                <Button size="sm" disabled={!selectedSessionId || !selectedSource} onClick={advanceState}>
                  Continue to Configuration
                </Button>
              </div>
            </Card>
          ) : null}

          {workflowState === "selection" && activeWorkflow === "migration-preview" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Select Source Context</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Preview requires explicit source context. Routed handoff can prefill only fields that were explicitly provided.
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Source product</span>
                  <select
                    value={previewSourceContext.product ?? ""}
                    onChange={(e) => setPreviewSourceContext((prev) => ({ ...prev, product: (e.target.value as MigrationPreviewSourceProduct) || undefined }))}
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  >
                    <option value="">Choose source product</option>
                    <option value="antigravity">Antigravity</option>
                    <option value="windsurf">Windsurf</option>
                    <option value="codex">Codex</option>
                    <option value="cursor">Cursor</option>
                    <option value="imported">Imported</option>
                    <option value="generated">Generated</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Source context type</span>
                  <select
                    value={previewSourceContext.kind ?? ""}
                    onChange={(e) => setPreviewSourceContext((prev) => ({ ...prev, kind: (e.target.value as MigrationPreviewSourceKind) || undefined }))}
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  >
                    <option value="">Choose source context</option>
                    <option value="session-evidence">Session evidence</option>
                    <option value="context-asset">Reusable context asset</option>
                    <option value="analysis-context">Analysis context</option>
                    <option value="project-overview">Project overview</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Source label (optional)</span>
                  <input
                    type="text"
                    value={previewSourceContext.label ?? ""}
                    onChange={(e) => setPreviewSourceContext((prev) => ({ ...prev, label: e.target.value || undefined }))}
                    placeholder="Keep explicit routed/source wording visible"
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                <Button size="sm" onClick={advanceState}>
                  Continue to Configuration
                </Button>
              </div>
            </Card>
          ) : null}

          {workflowState === "selection" && activeWorkflow === "bulk-session-backup" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Select Sessions</div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Select one or more sessions explicitly before validation. This workflow does not invent a session set from overview, analysis, or asset context.
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_180px_minmax(0,1fr)_auto]">
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">Session ID</span>
                    <input
                      type="text"
                      value={bulkDraftSessionId}
                      onChange={(e) => setBulkDraftSessionId(e.target.value)}
                      placeholder="Enter session ID"
                      className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">Source</span>
                    <select
                      value={bulkDraftSource}
                      onChange={(e) => setBulkDraftSource((e.target.value as Source | "") ?? "")}
                      className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                    >
                      <option value="">Choose source</option>
                      <option value="antigravity">Antigravity</option>
                      <option value="windsurf">Windsurf</option>
                      <option value="codex">Codex</option>
                      <option value="cursor">Cursor</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">Root ID (optional)</span>
                    <input
                      type="text"
                      value={bulkDraftRootId}
                      onChange={(e) => setBulkDraftRootId(e.target.value)}
                      placeholder="Optional root ID"
                      className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex items-end">
                    <Button size="sm" onClick={addBulkSelection} disabled={!bulkDraftSessionId.trim() || !bulkDraftSource}>
                      Add session
                    </Button>
                  </div>
                </div>
                {dedupedBulkSelections.length > 0 ? (
                  <div className="space-y-2">
                    {dedupedBulkSelections.map((selection) => (
                      <div key={`${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{selection.sessionId || "unresolved-session"}</div>
                            <div className="text-xs text-muted">
                              {selection.source ?? "unknown-source"}
                              {selection.rootId ? ` / ${selection.rootId}` : ""}
                            </div>
                            {selection.unresolvedReason ? (
                              <div className="mt-1 text-xs text-muted">{selection.unresolvedReason}</div>
                            ) : null}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => removeBulkSelection(selection)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-3 py-3 text-sm text-muted">
                    No sessions selected yet.
                  </div>
                )}
                {activeHandoff?.origin === "sessions" && dedupedBulkSelections.length > 0 ? (
                  <div className="text-xs text-muted">Pre-selected from routed handoff.</div>
                ) : null}
                <Button size="sm" disabled={dedupedBulkSelections.length === 0} onClick={advanceState}>
                  Continue to Configuration
                </Button>
              </div>
            </Card>
          ) : null}

          {workflowState === "selection" && activeWorkflow === "project-bundle" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Select Bundle Scope</div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Project Bundle is a real Backup / Migration workflow. Routed context can prefill cues and explicit refs, but final composition still happens here before validation and generation.
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES.map((category) => (
                    <label key={category} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={projectBundleSelection.includedCategories[category]}
                        onChange={(e) => toggleProjectBundleCategory(category, e.target.checked)}
                      />
                      <span>{formatBundleCategoryLabel(category)}</span>
                    </label>
                  ))}
                </div>
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Foundation metadata is always included:
                  <span className="ml-1 font-medium text-foreground">Package Metadata</span>
                  <span className="mx-1">and</span>
                  <span className="font-medium text-foreground">Project Metadata</span>.
                </div>
                <div className="space-y-3 rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Explicit session refs</div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_180px_minmax(0,1fr)_auto]">
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Session ID</span>
                      <input
                        type="text"
                        value={bundleDraftSessionId}
                        onChange={(e) => setBundleDraftSessionId(e.target.value)}
                        placeholder="Enter session ID"
                        className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Source</span>
                      <select
                        value={bundleDraftSource}
                        onChange={(e) => setBundleDraftSource((e.target.value as Source | "") ?? "")}
                        className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                      >
                        <option value="">Choose source</option>
                        <option value="antigravity">Antigravity</option>
                        <option value="windsurf">Windsurf</option>
                        <option value="codex">Codex</option>
                        <option value="cursor">Cursor</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted">Root ID (optional)</span>
                      <input
                        type="text"
                        value={bundleDraftRootId}
                        onChange={(e) => setBundleDraftRootId(e.target.value)}
                        placeholder="Optional root ID"
                        className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="flex items-end">
                      <Button size="sm" onClick={addProjectBundleSession} disabled={!bundleDraftSessionId.trim() || !bundleDraftSource}>
                        Add session ref
                      </Button>
                    </div>
                  </div>
                  {(projectBundleSelection.sessionSelections.length ?? 0) > 0 ? (
                    <div className="space-y-2">
                      {projectBundleSelection.sessionSelections.map((selection) => (
                        <div key={`${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{selection.sessionId}</div>
                              <div className="text-xs text-muted">
                                {selection.source ?? "unknown-source"}
                                {selection.rootId ? ` / ${selection.rootId}` : ""}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => removeProjectBundleSession(selection)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">No explicit sessions listed yet. If you keep sessions selected, validation may warn but will not invent session members for you.</div>
                  )}
                </div>
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  {summarizeProjectBundleSelection(projectBundleSelection)}
                </div>
                {!hasSelectedProjectBundleCategories ? (
                  <div id="project-bundle-selection-hint" className="text-xs text-muted">
                    Select at least one bundle category before continuing to configuration and validation.
                  </div>
                ) : null}
                <Button
                  size="sm"
                  aria-describedby={!hasSelectedProjectBundleCategories ? "project-bundle-selection-hint" : undefined}
                  disabled={!hasSelectedProjectBundleCategories}
                  onClick={() => {
                    if (!hasSelectedProjectBundleCategories) return;
                    advanceState();
                  }}
                >
                  Continue to Configuration
                </Button>
              </div>
            </Card>
          ) : null}

          {workflowState === "selection" && (activeWorkflow === "import-backup" || activeWorkflow === "validate-package") ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Select Package</div>
              <div className="space-y-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Backup ID</span>
                  <input
                    type="text"
                    value={backupIdInput}
                    onChange={(e) => setBackupIdInput(e.target.value)}
                    placeholder="Enter backup ID from managed backup store"
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                <Button size="sm" disabled={!normalizedBackupId} onClick={runValidation}>
                  Validate
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Configuration (session-backup only) */}
          {workflowState === "configuration" && activeWorkflow === "session-backup" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Configure Backup</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                  <div className="font-medium">Session: {selectedSessionId}</div>
                  <div className="text-xs text-muted">Source: {selectedSource}{selectedRootId ? ` / Root: ${selectedRootId}` : ""}</div>
                </div>
                {selectedSource === "windsurf" && selectedRecoverability && selectedRecoverability !== "ls_readable" ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-900 dark:text-amber-200">
                    <div className="font-medium">
                      {selectedRecoverability === "unavailable"
                        ? "Canonical Cascade content is unavailable"
                        : "This Cascade session carries bounded recovery evidence"}
                    </div>
                    <div className="mt-1 text-xs leading-5 opacity-90">
                      {selectedRecoverabilityNote ??
                        (selectedRecoverability === "unavailable"
                          ? "The running Windsurf LS no longer has this trajectory, so this workflow should be used for evidence review rather than canonical transcript backup."
                          : "Recovery evidence can be reviewed and preserved, but it does not imply transcript reconstruction or vendor-runtime restoration.")}
                    </div>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSource === "codex" ? includeSourceCopy : false}
                    disabled={selectedSource !== "codex"}
                    onChange={(e) => {
                      if (selectedSource !== "codex") return;
                      setIncludeSourceCopy(e.target.checked);
                    }}
                  />
                  <span className={selectedSource !== "codex" ? "text-muted" : undefined}>
                    Include source copy (advanced, opt-in)
                  </span>
                </label>
                <div className="text-xs leading-5 text-muted">
                  Source backup is an optional advanced option. The default backup preserves the canonical session record only.
                  Source copy stores a separate copy of the original source material without modifying the upstream session source.
                </div>
                {selectedSource !== "codex" ? (
                  <div className="text-xs leading-5 text-muted">
                    Include source copy is only available for Codex session backups and is unavailable for this source.
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={retreatState}>
                    Back
                  </Button>
                  <Button size="sm" onClick={runValidation}>
                    Validate
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {workflowState === "configuration" && activeWorkflow === "bulk-session-backup" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Configure Batch</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Configure source copy per selected session. Source copy remains opt-in and only eligible sessions can actually include it.
                </div>
                <div className="space-y-2">
                  {dedupedBulkSelections.map((selection) => {
                    const canSourceCopy = selection.source === "codex";
                    return (
                      <div key={`${selection.sessionId}:${selection.source ?? ""}:${selection.rootId ?? ""}`} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{selection.sessionId}</div>
                            <div className="text-xs text-muted">
                              {selection.source ?? "unknown-source"}
                              {selection.rootId ? ` / ${selection.rootId}` : ""}
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={canSourceCopy ? selection.includeSourceCopy === true : false}
                              disabled={!canSourceCopy}
                              onChange={(e) => updateBulkSelectionSourceCopy(selection, e.target.checked)}
                            />
                            <span className={!canSourceCopy ? "text-muted" : undefined}>Include source copy</span>
                          </label>
                        </div>
                        {!canSourceCopy ? (
                          <div className="mt-2 text-xs text-muted">
                            Source copy is unavailable for this source. Backup will preserve the canonical record only.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  {bulkConfirmationDetails.sourceCopySummary}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={retreatState}>
                    Back
                  </Button>
                  <Button size="sm" onClick={runValidation}>
                    Validate
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {workflowState === "configuration" && activeWorkflow === "migration-preview" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Configure Preview</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Keep source, target, and scope explicit. This workflow is preview only and does not apply migration or generate bundles.
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Target context</span>
                  <select
                    value={previewTargetContext.profile ?? ""}
                    onChange={(e) => setPreviewTargetContext((prev) => ({ ...prev, profile: (e.target.value as MigrationPreviewTargetProfile) || undefined }))}
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  >
                    <option value="">Choose target context</option>
                    <option value="session-backup-package">Session backup package</option>
                    <option value="reusable-context-assets">Reusable context assets</option>
                    <option value="project-context-subset">Project-context subset</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Preview scope</span>
                  <select
                    value={previewScope.kind ?? ""}
                    onChange={(e) => setPreviewScope((prev) => ({ ...prev, kind: (e.target.value as MigrationPreviewScopeKind) || undefined }))}
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  >
                    <option value="">Choose bounded scope</option>
                    <option value="sessions">Sessions</option>
                    <option value="assets">Reusable context assets</option>
                    <option value="project-context">Project-context subset</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Scope item refs</span>
                  <textarea
                    value={previewScopeDraft}
                    onChange={(e) => setPreviewScopeDraft(e.target.value)}
                    placeholder="One explicit session / asset / project-context ref per line"
                    rows={6}
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                <div className="text-xs leading-5 text-muted">
                  Empty scope remains visible and leads to an explicit no-result preview state so you can return here and refine the bounded scope.
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={retreatState}>
                    Back
                  </Button>
                  <Button size="sm" onClick={runValidation}>
                    Validate Preview
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {workflowState === "configuration" && activeWorkflow === "project-bundle" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Configure Bundle</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                  Bundle generation is gated by composition and validation. This configuration step only sets bundle identity and notes; it does not decide final composition for you.
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Bundle name</span>
                  <input
                    type="text"
                    value={bundleConfig.bundleName}
                    onChange={(e) => setBundleConfig((prev) => ({ ...prev, bundleName: e.target.value }))}
                    placeholder="Enter bundle name"
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Notes (optional)</span>
                  <textarea
                    value={bundleConfig.notes ?? ""}
                    onChange={(e) => setBundleConfig((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    placeholder="Optional notes captured in package metadata"
                    className="rounded-lg border border-border/60 bg-background/30 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={retreatState}>
                    Back
                  </Button>
                  <Button size="sm" onClick={runValidation}>
                    Validate Bundle
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {activeWorkflow === "migration-preview" && workflowState !== "validation" && validationResult?.status === "invalid" ? (
            <ValidationPanel result={validationResult} />
          ) : null}

          {/* Validation */}
          {workflowState === "validation" && validationResult ? (
            <div className="space-y-4">
              <ValidationPanel result={validationResult} />
              {activeWorkflow === "bulk-session-backup" && (validationResult.sessionResults?.length ?? 0) > 0 ? (
                <Card className="p-4">
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Per-session eligibility</div>
                  <div className="space-y-2">
                    {validationResult.sessionResults!.map((entry) => (
                      <div key={`${entry.session.sessionId}:${entry.session.source ?? ""}:${entry.session.rootId ?? ""}`} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{entry.session.sessionId || "unresolved-session"}</div>
                            <div className="text-xs text-muted">
                              {entry.session.source ?? "unknown-source"}
                              {entry.session.rootId ? ` / ${entry.session.rootId}` : ""}
                            </div>
                          </div>
                          <Badge variant={entry.result.status === "valid" ? "ok" : entry.result.status === "invalid" ? "warn" : "default"}>
                            {entry.result.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
              {activeWorkflow === "project-bundle" && projectBundleMemberInventory.length > 0 ? (
                <Card className="p-4">
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Bundle inventory</div>
                  <div className="space-y-2">
                    {projectBundleMemberInventory.map((item) => (
                      <div key={item.category} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{formatBundleCategoryLabel(item.category)}</div>
                          <Badge variant={item.status === "ready" ? "ok" : item.status === "warning" ? "warn" : "default"}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
              {activeWorkflow === "project-bundle" && projectBundleMemberReferences.length > 0 ? (
                <Card className="p-4">
                  <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Member references</div>
                  <div className="space-y-2">
                    {projectBundleMemberReferences.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{item.label}</div>
                          <Badge variant={item.status === "resolved" ? "ok" : "warn"}>{item.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={retreatState}>
                  Back
                </Button>
                {activeWorkflow === "validate-package" ? (
                  <Button size="sm" onClick={finishValidateOnly}>
                    Complete Validation
                  </Button>
                ) : activeWorkflow === "migration-preview" ? (
                  isPreviewReadyForResult({
                    sourceContext: previewSourceContext,
                    targetContext: previewTargetContext,
                    scope: previewScope,
                  }) ? (
                    <Button size="sm" onClick={finishMigrationPreview}>
                      Open Preview Result
                    </Button>
                  ) : (
                    <div className="text-sm text-muted">Source, target, and scope must remain explicit before preview result can open.</div>
                  )
                ) : canProceedFromValidation(validationResult) ? (
                  <Button size="sm" onClick={advanceState}>
                    Proceed to Confirmation
                  </Button>
                ) : activeWorkflow === "bulk-session-backup" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={removeBlockedSelections}>
                      Remove blocked selections
                    </Button>
                    <div className="text-sm text-muted">Resolve blocking sessions before proceeding.</div>
                  </>
                ) : (
                  <div className="text-sm text-muted">Resolve blocking issues before proceeding.</div>
                )}
              </div>
            </div>
          ) : null}

          {/* Confirmation */}
          {workflowState === "confirmation" ? (
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Confirm Operation</div>
              <div className="space-y-3">
                {activeWorkflow === "session-backup" ? (
                  <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                    <div className="font-medium">Create backup for session {selectedSessionId}</div>
                    <div className="text-xs text-muted">
                      Source: {selectedSource}{includeSourceCopy ? " (with source copy)" : ""}
                    </div>
                  </div>
                ) : null}
                {activeWorkflow === "import-backup" ? (
                  <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                    <div className="font-medium">Import backup package {normalizedBackupId}</div>
                  </div>
                ) : null}
                {activeWorkflow === "bulk-session-backup" ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                        <div className="text-xs text-muted">Selected count</div>
                        <div className="mt-1 font-medium">{bulkConfirmationDetails.selectedCount}</div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                        <div className="text-xs text-muted">Warnings</div>
                        <div className="mt-1 font-medium">{bulkConfirmationDetails.warningCount}</div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                        <div className="text-xs text-muted">Execution</div>
                        <div className="mt-1 font-medium">Sequential fan-out</div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                      {bulkConfirmationDetails.sourceCopySummary}
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                      {bulkConfirmationDetails.executionSemantics}
                    </div>
                  </div>
                ) : null}
                {activeWorkflow === "project-bundle" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                      <div className="font-medium">{bundleConfig.bundleName}</div>
                      <div className="mt-1 text-xs text-muted">{summarizeProjectBundleSelection(projectBundleSelection)}</div>
                      {bundleConfig.notes ? <div className="mt-2 text-xs text-muted">{bundleConfig.notes}</div> : null}
                    </div>
                    {projectBundleValidationSummary ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                          <div className="text-xs text-muted">Warnings</div>
                          <div className="mt-1 font-medium">{projectBundleValidationSummary.warningCount}</div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                          <div className="text-xs text-muted">Resolved refs</div>
                          <div className="mt-1 font-medium">{projectBundleValidationSummary.resolvedReferenceCount}</div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                          <div className="text-xs text-muted">Unresolved refs</div>
                          <div className="mt-1 font-medium">{projectBundleValidationSummary.unresolvedReferenceCount}</div>
                        </div>
                      </div>
                    ) : null}
                    <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                      Generation writes a real local bundle file containing manifest, package metadata, project metadata, member inventory, member references, validation summary, and lightweight member snapshots.
                    </div>
                  </div>
                ) : null}
                <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-3 text-sm text-muted">
                  <span className="font-medium text-foreground">Preservation notice:</span>{" "}
                  {activeWorkflow === "project-bundle"
                    ? "Project Bundle preserves portable project context composition only. It does not promise restore, apply, vendor-runtime reopen, cloud sync, or full app snapshot semantics."
                    : activeWorkflow === "import-backup"
                    ? "Import restores product-readable state only. Sessions will not reopen inside a third-party agent runtime or private source store."
                    : "This backup preserves a canonical session record. It does not modify, move, or delete the upstream session source."}
                </div>
                {validationResult?.items.some((i) => i.severity === "warning") ? (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-3 py-3 text-sm text-muted">
                    Validation passed with warnings. Review them before confirming.
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={retreatState}>
                    Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={isExecuting}
                    onClick={
                      activeWorkflow === "session-backup"
                        ? executeSessionBackup
                        : activeWorkflow === "bulk-session-backup"
                          ? executeBulkSessionBackup
                          : activeWorkflow === "project-bundle"
                            ? executeProjectBundle
                            : executeImport
                    }
                  >
                    {isExecuting ? "Executing…" : "Execute"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Execution */}
          {workflowState === "execution" && isExecuting ? (
            <Card className="p-4">
              <div className="text-sm text-muted">Executing workflow… Please wait.</div>
            </Card>
          ) : null}

          {/* Execution error shown in failed state is handled by the terminal render above */}
          {executionError && workflowState !== "failed" ? (
            <Card className="border-red-400/40 p-4">
              <div className="text-sm font-medium text-foreground">Execution error</div>
              <div className="mt-1 text-sm text-muted">{executionError}</div>
            </Card>
          ) : null}
        </div>

        {/* Right sidebar: context summary + navigation */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Workflow Context</div>
            <div className="space-y-2 text-sm">
              {descriptor ? (
                <div>
                  <div className="font-medium">{descriptor.label}</div>
                  <div className="text-xs leading-5 text-muted">{descriptor.description}</div>
                </div>
              ) : null}
              {selectedSessionId && activeWorkflow === "session-backup" ? (
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-2">
                  <div className="text-xs text-muted">Session</div>
                  <div className="font-medium">{selectedSessionId}</div>
                  {selectedSource ? <div className="text-xs text-muted">{selectedSource}</div> : null}
                </div>
              ) : null}
              {activeWorkflow === "bulk-session-backup" ? (
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-2">
                  <div className="text-xs text-muted">Selected sessions</div>
                  <div className="font-medium">{dedupedBulkSelections.length}</div>
                  <div className="mt-1 text-xs text-muted">{bulkConfirmationDetails.sourceCopySummary}</div>
                </div>
              ) : null}
              {activeWorkflow === "migration-preview" ? (
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-2">
                  <div className="text-xs text-muted">Preview context</div>
                  <div className="font-medium">
                    {previewSourceContext.product && previewSourceContext.kind
                      ? `${formatMigrationPreviewSourceProductLabel(previewSourceContext.product)} / ${formatMigrationPreviewSourceKindLabel(previewSourceContext.kind)}`
                      : "Source still required"}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {previewTargetContext.profile ? formatMigrationPreviewTargetProfileLabel(previewTargetContext.profile) : "Target still required"}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {previewScope.kind
                      ? `${formatMigrationPreviewScopeLabel(previewScope.kind)} (${previewScope.itemRefs.length || previewScopeDraft.split("\n").map((item) => item.trim()).filter(Boolean).length})`
                      : "Scope still required"}
                  </div>
                </div>
              ) : null}
              {activeWorkflow === "project-bundle" ? (
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-2">
                  <div className="text-xs text-muted">Bundle context</div>
                  <div className="font-medium">{bundleConfig.bundleName || "Bundle name still required"}</div>
                  <div className="mt-1 text-xs text-muted">{summarizeProjectBundleSelection(projectBundleSelection)}</div>
                  {projectBundleSelection.scopeHint ? <div className="mt-1 text-xs text-muted">Scope hint: {projectBundleSelection.scopeHint}</div> : null}
                  {projectBundleSelection.filterHint ? <div className="mt-1 text-xs text-muted">Filter hint: {projectBundleSelection.filterHint}</div> : null}
                </div>
              ) : null}
              {normalizedBackupId && activeWorkflow !== "session-backup" ? (
                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-2">
                  <div className="text-xs text-muted">Backup ID</div>
                  <div className="font-medium">{normalizedBackupId}</div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted">Navigation</div>
            <div className="space-y-2">
              <Button className="w-full justify-start" size="sm" variant="outline" onClick={onNavigateSessions}>
                Return to Sessions
              </Button>
              <Button className="w-full justify-start" size="sm" variant="outline" onClick={onNavigateOverview}>
                Return to Overview
              </Button>
            </div>
          </Card>

          <RecentOperationsPanel operations={recentOperations} onSelectOperation={handleSelectRecentOperation} />
        </div>
      </div>
    </div>
  );
}

export default BackupMigrationFoundation;
