"use client";

import React, { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addRecentOperation,
  buildSessionBackupExecutionRequest,
  canProceedFromValidation,
  createOperationResult,
  deriveValidationResult,
  formatWorkflowStateLabel,
  formatWorkflowTypeLabel,
  getNextState,
  getPreviousState,
  getStepsForWorkflow,
  getWorkflowDescriptor,
  isTerminalState,
  normalizeBackupId,
  resolveWorkflowFromHandoff,
  validateBackupPackageRemote,
  WORKFLOW_DESCRIPTORS,
  type BackupMigrationHandoff,
  type BackupOperationResult,
  type BackupValidationItem,
  type BackupValidationResult,
  type BackupWorkflowState,
  type BackupWorkflowType,
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

function ValidationPanel(props: { result: BackupValidationResult }) {
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

function OperationResultPanel(props: { result: BackupOperationResult; onNewWorkflow(): void }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted">Operation Result</div>
        <Badge variant={props.result.status === "success" ? "ok" : props.result.status === "failed" ? "warn" : "default"}>
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
        <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
          <span className="font-medium text-foreground">No vendor-runtime restore.</span>{" "}
          Imported or backed-up sessions are product-readable only. They will not reopen inside a third-party agent runtime or private source store.
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
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
                <Badge variant={op.status === "success" ? "ok" : op.status === "failed" ? "warn" : "default"}>
                  {op.status}
                </Badge>
                <span className="font-medium">{formatWorkflowTypeLabel(op.workflowType)}</span>
              </div>
              <span className="text-xs text-muted">{new Date(op.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="mt-1 text-xs text-muted">{op.summary}</div>
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

  // Import / validate state
  const [backupIdInput, setBackupIdInput] = useState("");

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

  // ── Actions ──
  const resetWorkflow = useCallback(() => {
    setActiveWorkflow(null);
    setWorkflowState("idle");
    setActiveHandoff(null);
    setSelectedSessionId(null);
    setSelectedSource(null);
    setSelectedRootId(null);
    setIncludeSourceCopy(false);
    setBackupIdInput("");
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
  }, []);

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
    let items: BackupValidationItem[];
    if (activeWorkflow === "session-backup") {
      items = buildSessionBackupValidation(selectedSessionId);
    } else {
      if (!normalizedBackupId) {
        items = activeWorkflow === "import-backup"
          ? buildImportValidation(null)
          : buildValidatePackageValidation(null);
      } else {
        items = await validateBackupPackageRemote(fetch, normalizedBackupId);
      }
    }
    const result = deriveValidationResult(items);
    setValidationResult(result);
    setWorkflowState("validation");
  }, [activeWorkflow, normalizedBackupId, selectedSessionId]);

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

  const handleSelectRecentOperation = useCallback((op: RecentOperation) => {
    setOperationResult(op);
    setActiveWorkflow(op.workflowType);
    setWorkflowState("result");
  }, []);

  // ── Auto-prefill from handoff ──
  const prefillSessionId = useMemo(() => handoff?.sessionId ?? null, [handoff]);

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
              This foundation does not support bulk backup, migration execution, project bundle packaging, vendor-runtime restore, or cloud sync.
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

        <OperationResultPanel result={operationResult} onNewWorkflow={resetWorkflow} />

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

          {/* Validation */}
          {workflowState === "validation" && validationResult ? (
            <div className="space-y-4">
              <ValidationPanel result={validationResult} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={retreatState}>
                  Back
                </Button>
                {activeWorkflow === "validate-package" ? (
                  <Button size="sm" onClick={finishValidateOnly}>
                    Complete Validation
                  </Button>
                ) : canProceedFromValidation(validationResult) ? (
                  <Button size="sm" onClick={advanceState}>
                    Proceed to Confirmation
                  </Button>
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
                    onClick={activeWorkflow === "session-backup" ? executeSessionBackup : executeImport}
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
