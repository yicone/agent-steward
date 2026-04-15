"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addRecentOperation,
  buildBulkSessionValidationResult,
  buildMigrationPreviewItems,
  buildSessionBackupExecutionRequest,
  canProceedFromValidation,
  createMigrationPreviewOperationResult,
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
  formatWorkflowStateLabel,
  formatWorkflowTypeLabel,
  getBlockedSessionSelections,
  getNextState,
  getPreviousState,
  getStepsForWorkflow,
  getWorkflowDescriptor,
  isTerminalState,
  normalizeBackupId,
  resolveWorkflowFromHandoff,
  summarizeSourceCopyConfiguration,
  validateBackupPackageRemote,
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
  type RecentOperation,
} from "@/lib/backupMigration";
import type { Source } from "@/lib/types";

// ── Props ───────────────────────────────────────────────────────────────────

export type BackupMigrationFoundationProps = {
  handoff: BackupMigrationHandoff | null;
  onNavigateSessions(): void;
  onNavigateOverview(): void;
};

// ── Validation seed helpers ─────────────────────────────────────────────────

function buildSessionBackupValidation(sessionId: string | null): BackupValidationItem[] {
  if (!sessionId) {
    return [{ id: "v-no-session", label: "No session selected", severity: "block", detail: "Select a session before proceeding." }];
  }
  return [
    { id: "v-schema", label: "Schema version", severity: "ok", detail: "session-record/v1 is supported." },
    { id: "v-integrity", label: "Session integrity", severity: "ok", detail: "Session data passes integrity checks." },
    { id: "v-provenance", label: "Provenance", severity: "ok", detail: "Source reference is present and traceable." },
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
          {props.result.status}
        </Badge>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
          <div className="font-medium">{formatWorkflowTypeLabel(props.result.workflowType)}</div>
          <div className="mt-1 text-muted">{props.result.summary}</div>
          {props.result.backupId ? (
            <div className="mt-2 text-xs text-muted">Backup ID: {props.result.backupId}</div>
          ) : null}
          {props.result.sessionCount != null ? (
            <div className="text-xs text-muted">Sessions: {props.result.sessionCount}</div>
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
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">No vendor-runtime restore.</span>{" "}
            Imported or backed-up sessions are product-readable only. They will not reopen inside a third-party agent runtime or private source store.
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {props.result.workflowType === "migration-preview" ? (
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
                  {op.status}
                </Badge>
                <span className="font-medium">{formatWorkflowTypeLabel(op.workflowType)}</span>
              </div>
              <span className="text-xs text-muted">{new Date(op.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="mt-1 text-xs text-muted">{op.summary}</div>
            {op.sessionCount != null ? <div className="mt-1 text-[11px] text-muted">Sessions: {op.sessionCount}</div> : null}
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
  const [workflowState, setWorkflowState] = useState<BackupWorkflowState>(initialWorkflow ? "selection" : "idle");
  const [activeHandoff, setActiveHandoff] = useState<BackupMigrationHandoff | null>(handoff);

  // Session backup state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(handoff?.sessionId ?? null);
  const [selectedSource, setSelectedSource] = useState<Source | null>((handoff?.source as Source) ?? null);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(handoff?.rootId ?? null);
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
  const bulkConfirmationDetails = useMemo(
    () => buildBulkConfirmationDetails({ selections: dedupedBulkSelections, validationResult }),
    [dedupedBulkSelections, validationResult]
  );

  // ── Actions ──
  const resetWorkflow = useCallback(() => {
    setActiveWorkflow(null);
    setWorkflowState("idle");
    setActiveHandoff(null);
    setSelectedSessionId(null);
    setSelectedSource(null);
    setSelectedRootId(null);
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
      const result = deriveValidationResult(buildSessionBackupValidation(selectedSessionId));
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
        itemRefs: previewScopeDraft
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      setPreviewScope(nextScope);
      const result = deriveMigrationPreviewValidationResult({
        sourceContext: previewSourceContext,
        targetContext: previewTargetContext,
        scope: nextScope,
      });
      setValidationResult(result);
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
  }, [activeWorkflow, dedupedBulkSelections, normalizedBackupId, previewScope, previewScopeDraft, previewSourceContext, previewTargetContext, selectedSessionId]);

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
      setOperationResult(result);
      setRecentOperations((prev) => addRecentOperation(prev, result));
      setWorkflowState("result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionError(message);
      const result = createOperationResult({
        workflowType: "session-backup",
        status: "failed",
        summary: `Session backup failed: ${message}`,
      });
      setOperationResult(result);
      setRecentOperations((prev) => addRecentOperation(prev, result));
      setWorkflowState("failed");
    } finally {
      setIsExecuting(false);
    }
  }, [selectedSessionId, selectedSource, selectedRootId, includeSourceCopy]);

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

      setOperationResult(result);
      setRecentOperations((prev) => addRecentOperation(prev, result));
      setWorkflowState(aggregateStatus === "failed" ? "failed" : "result");
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
      setOperationResult(result);
      setRecentOperations((prev) => addRecentOperation(prev, result));
      setWorkflowState("failed");
    } finally {
      setIsExecuting(false);
    }
  }, [dedupedBulkSelections, validationResult]);

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
      setOperationResult(result);
      setRecentOperations((prev) => addRecentOperation(prev, result));
      setWorkflowState("result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExecutionError(message);
      const result = createOperationResult({
        workflowType: "import-backup",
        status: "failed",
        summary: `Import failed: ${message}`,
      });
      setOperationResult(result);
      setRecentOperations((prev) => addRecentOperation(prev, result));
      setWorkflowState("failed");
    } finally {
      setIsExecuting(false);
    }
  }, [normalizedBackupId]);

  const finishValidateOnly = useCallback(() => {
    if (!validationResult) return;
    const result = createOperationResult({
      workflowType: "validate-package",
      status: validationResult.status === "invalid" ? "failed" : validationResult.status === "valid-with-warnings" ? "success-with-warnings" : "success",
      summary: `Package validation: ${validationResult.status}.`,
      warnings: validationResult.items.filter((i) => i.severity === "warning").map((i) => i.detail),
    });
    setOperationResult(result);
    setRecentOperations((prev) => addRecentOperation(prev, result));
    setWorkflowState("result");
  }, [validationResult]);

  const finishMigrationPreview = useCallback(() => {
    const nextScope: MigrationPreviewScope = {
      ...previewScope,
      itemRefs: previewScopeDraft
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
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
    setOperationResult(result);
    setRecentOperations((prev) => addRecentOperation(prev, result));
    setWorkflowState("result");
  }, [activeHandoff?.issueLabel, previewScope, previewScopeDraft, previewSourceContext, previewTargetContext]);

  const handleSelectRecentOperation = useCallback((op: RecentOperation) => {
    setOperationResult(op);
    setActiveWorkflow(op.workflowType);
    if (op.workflowType === "migration-preview") {
      setPreviewSourceContext(op.previewSourceContext ?? {});
      setPreviewTargetContext(op.previewTargetContext ?? {});
      setPreviewScope(op.previewScope ?? { itemRefs: [] });
      setPreviewScopeDraft((op.previewScope?.itemRefs ?? []).join("\n"));
    }
    setWorkflowState("result");
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
              This foundation does not support migration apply, project bundle packaging, vendor-runtime restore, or cloud sync.
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
                <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-3 text-sm text-muted">
                  <span className="font-medium text-foreground">Preservation notice:</span>{" "}
                  {activeWorkflow === "import-backup"
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
                    onClick={activeWorkflow === "session-backup" ? executeSessionBackup : activeWorkflow === "bulk-session-backup" ? executeBulkSessionBackup : executeImport}
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
