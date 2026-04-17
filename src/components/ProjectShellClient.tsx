"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import AnalysisFoundation from "@/components/AnalysisFoundation";
import AssetsFoundation from "@/components/AssetsFoundation";
import BackupMigrationFoundation from "@/components/BackupMigrationFoundation";
import { buildBackupHandoffInstanceKey, type BackupMigrationHandoff, type BackupWorkflowType, type BackupSessionSelection } from "@/lib/backupMigration";
import HomeClient, { type HomeClientAssetHandoff, type HomeClientExternalSelection, type HomeClientSessionHandoff } from "@/components/HomeClient";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AnalysisFindingStatus, AnalysisHandoff, AnalysisIssueClass, AnalysisObjectType, AnalysisSeverity } from "@/lib/analysisFindings";
import type { AssetsHandoff, ContextAssetScope, ContextAssetStatus, ContextAssetSubtype } from "@/lib/contextAssets";
import {
  deriveProjectOverviewSummary,
  type ProjectOverviewAssetSummary,
  type ProjectOverviewAttentionItem,
  type ProjectOverviewQuickAction,
  type ProjectOverviewRoute,
  type ProjectOverviewSessionSummary,
  type ProjectOverviewSnapshotCue,
  type ProjectOverviewSummary,
} from "@/lib/projectOverview";
import { cancelPendingUrlSync } from "@/lib/urlState";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/types";

export type ProjectShellPage = "overview" | "sessions" | "assets" | "analysis" | "backup";

type ProjectShellNavItem = {
  id: ProjectShellPage;
  label: string;
  eyebrow: string;
};

type PlaceholderCue = {
  title: string;
  body: string;
};

type SessionAssetsHandoffInput = Pick<HomeClientAssetHandoff, "sessionId" | "subtype">;

const NAV_ITEMS: ProjectShellNavItem[] = [
  { id: "overview", label: "Project Overview", eyebrow: "govern" },
  { id: "sessions", label: "Sessions", eyebrow: "evidence" },
  { id: "assets", label: "Assets", eyebrow: "context" },
  { id: "analysis", label: "Analysis", eyebrow: "insight" },
  { id: "backup", label: "Backup / Migration", eyebrow: "workflow" },
];

export function resolveInitialProjectShellPage(search: string): ProjectShellPage {
  const params = new URLSearchParams(search);
  return params.has("id") || params.has("source") ? "sessions" : "overview";
}

export function buildExternalSessionSelection(input: {
  requestId: number;
  sessionId: string;
  source: Source;
  rootId?: string;
}): HomeClientExternalSelection {
  return {
    requestId: input.requestId,
    sessionId: input.sessionId,
    source: input.source,
    ...(input.rootId ? { rootId: input.rootId } : {}),
  };
}

export function buildAssetsHandoffFromSession(input: SessionAssetsHandoffInput): AssetsHandoff {
  return {
    origin: "sessions",
    subtitle: "Continue reviewing reusable context from the selected session.",
    continueLabel: "Inspect the routed subtype, then refine scope or selection if you need a different reusable asset.",
    returnLabel: "Return to the originating session if you need more evidence.",
    subtype: input.subtype,
    sessionId: input.sessionId,
  };
}

export function buildAssetsHandoffFromOverview(input: {
  subtitle: string;
  subtype?: ContextAssetSubtype;
  scope?: ContextAssetScope;
  status?: ContextAssetStatus;
  assetId?: string;
  issueLabel?: string;
}): AssetsHandoff {
  return {
    origin: "overview",
    subtitle: input.subtitle,
    continueLabel: "Start from the overview context, then inspect the matching reusable asset or adjust filters without losing the project-level framing.",
    returnLabel: "Return to Project Overview when the broader project picture matters again.",
    subtype: input.subtype,
    scope: input.scope,
    status: input.status,
    assetId: input.assetId,
    issueLabel: input.issueLabel,
  };
}

export function buildAssetsHandoffFromAnalysis(input: {
  subtitle: string;
  subtype?: ContextAssetSubtype;
  status?: ContextAssetStatus;
  assetId?: string;
  issueLabel: string;
}): AssetsHandoff {
  return {
    origin: "analysis",
    subtitle: input.subtitle,
    continueLabel: "Keep the issue framing visible until you intentionally change subtype, scope, or object focus.",
    returnLabel: "Return to Analysis to continue grouped interpretation after object review.",
    subtype: input.subtype,
    status: input.status,
    assetId: input.assetId,
    issueLabel: input.issueLabel,
  };
}

function mapAssetStatusToAnalysisIssueClass(status?: ContextAssetStatus): AnalysisIssueClass | undefined {
  if (status === "stale") return "stale";
  if (status === "conflicted") return "conflict";
  if (status === "orphaned") return "provenance";
  if (status === "unknown") return "unknown";
  return undefined;
}

export function buildAnalysisHandoffFromAssets(input: {
  issueLabel: string;
  assetId?: string;
  subtype?: ContextAssetSubtype;
  status?: ContextAssetStatus;
}): AnalysisHandoff {
  const issueClass = mapAssetStatusToAnalysisIssueClass(input.status);

  return {
    origin: "assets",
    subtitle: `Review issue context from Assets: ${input.issueLabel}.`,
    continueLabel: "Interpret the affected asset issue, then route corrective work to the owning surface.",
    returnLabel: "Return to Assets to continue object-level review.",
    issueClass,
    objectType: "asset",
    assetId: input.assetId,
    assetSubtype: input.subtype,
    issueLabel: input.issueLabel,
  };
}

export function buildAnalysisHandoffFromOverview(input: {
  subtitle: string;
  issueClass?: AnalysisIssueClass;
  severity?: AnalysisSeverity;
  objectType?: AnalysisObjectType;
  status?: AnalysisFindingStatus;
  findingId?: string;
  issueLabel?: string;
}): AnalysisHandoff {
  return {
    origin: "overview",
    subtitle: input.subtitle,
    continueLabel: "Start from the project-level issue framing, then inspect the matching finding or adjust filters.",
    returnLabel: "Return to Project Overview when the broader project picture matters again.",
    issueClass: input.issueClass,
    severity: input.severity,
    objectType: input.objectType,
    status: input.status,
    findingId: input.findingId,
    issueLabel: input.issueLabel,
  };
}

export function buildAnalysisHandoffFromSession(input: HomeClientSessionHandoff): AnalysisHandoff {
  return {
    origin: "sessions",
    subtitle: "Review analysis findings related to the selected session evidence.",
    continueLabel: "Keep the session evidence boundary visible while interpreting matching findings.",
    returnLabel: "Return to the originating session if you need transcript or trajectory detail.",
    issueClass: "preservation",
    sessionId: input.sessionId,
    source: input.source,
    rootId: input.rootId,
  };
}

const SESSION_VIEWER_QUERY_KEYS = [
  "source",
  "id",
  "rootId",
  "view",
  "ft",
  "stepType",
  "expanded",
  "row",
  "inspector",
  "includeCleared",
] as const;

export function stripSessionViewerSearchParams(search: string): string {
  const params = new URLSearchParams(search);
  let changed = false;

  for (const key of SESSION_VIEWER_QUERY_KEYS) {
    if (!params.has(key)) continue;
    params.delete(key);
    changed = true;
  }

  if (!changed) return search;

  const next = params.toString();
  return next ? `?${next}` : "";
}

export function buildAssetsFoundationInstanceKey(handoff: AssetsHandoff | null): string {
  if (!handoff) return "assets:no-handoff";

  return [
    "assets",
    handoff.origin,
    handoff.subtype ?? "all-subtypes",
    handoff.scope ?? "all-scopes",
    handoff.source ?? "all-sources",
    handoff.status ?? "all-statuses",
    handoff.assetId ?? "no-asset",
    handoff.sessionId ?? "no-session",
    handoff.issueLabel ?? "no-issue",
  ].join(":");
}

export function buildBackupHandoffFromAssets(context: {
  assetId?: string;
  subtype?: ContextAssetSubtype;
  workflowType?: "migration-preview" | "project-bundle";
}): BackupMigrationHandoff {
  if (context.workflowType === "project-bundle") {
    return {
      origin: "assets",
      subtitle: `Open Project Bundle${context.subtype ? ` with ${context.subtype} asset context` : ""}${context.assetId ? ` starting from ${context.assetId}` : ""}.`,
      continueLabel: "Assets may prefill explicit object references and compact hints only. Final bundle composition still happens in Backup / Migration.",
      returnLabel: "Return to Assets for object-level review.",
      assetId: context.assetId,
      assetSubtype: context.subtype,
      workflowType: "project-bundle",
      projectBundleScopeHint: context.subtype ? `${context.subtype} asset scope` : undefined,
      projectBundleObjectRefs: context.assetId ? [context.assetId] : [],
      projectBundleFilterHint: context.subtype ? `asset subtype = ${context.subtype}` : undefined,
    };
  }

  return {
    origin: "assets",
    subtitle: `Preview bounded migration scope${context.subtype ? ` for ${context.subtype} assets` : ""}${context.assetId ? ` starting from ${context.assetId}` : ""}.`,
    continueLabel: "Only explicit asset source and scope context are prefilled here. Source and target remain editable if they were not supplied by the route.",
    returnLabel: "Return to Assets for object-level review.",
    assetId: context.assetId,
    assetSubtype: context.subtype,
    workflowType: "migration-preview",
    migrationPreviewSourceContext: {
      kind: "context-asset",
      label: context.assetId,
    },
    migrationPreviewScope: {
      kind: "assets",
      itemRefs: context.assetId ? [context.assetId] : [],
      label: context.subtype ? `${context.subtype} asset scope` : undefined,
    },
  };
}

export function buildBackupHandoffFromAnalysis(context: {
  findingId: string;
  title: string;
  preservationWarning?: string;
  routeLabel?: string;
  backupWorkflowType?: "session-backup" | "migration-preview" | "project-bundle";
}): BackupMigrationHandoff {
  if (context.backupWorkflowType === "project-bundle") {
    return {
      origin: "analysis",
      subtitle: `${context.routeLabel ?? "Project bundle"} for ${context.title}.`,
      continueLabel: context.preservationWarning ?? "Analysis may preserve issue framing, but Backup / Migration still owns explicit bundle composition and validation.",
      returnLabel: "Return to Analysis for grouped interpretation.",
      findingId: context.findingId,
      preservationWarning: context.preservationWarning,
      issueLabel: context.title,
      workflowType: "project-bundle",
      projectBundleScopeHint: "analysis-routed bundle context",
      projectBundleObjectRefs: [context.findingId],
    };
  }

  if (context.backupWorkflowType !== "migration-preview") {
    return {
      origin: "analysis",
      subtitle: `${context.routeLabel ?? "Recommended route"} for ${context.title}.`,
      continueLabel: context.preservationWarning ?? "Backup / Migration owns workflow validation and execution.",
      returnLabel: "Return to Analysis for grouped interpretation.",
      findingId: context.findingId,
      preservationWarning: context.preservationWarning,
      issueLabel: context.title,
      workflowType: "session-backup",
    };
  }

  return {
    origin: "analysis",
    subtitle: `${context.routeLabel ?? "Migration preview"} for ${context.title}.`,
    continueLabel: context.preservationWarning ?? "Analysis issue context is preserved, but missing source or target must still be entered explicitly before preview can complete.",
    returnLabel: "Return to Analysis for grouped interpretation.",
    findingId: context.findingId,
    preservationWarning: context.preservationWarning,
    issueLabel: context.title,
    workflowType: "migration-preview",
    migrationPreviewSourceContext: {
      kind: "analysis-context",
      label: context.title,
    },
  };
}

export function buildBackupHandoffFromSessions(context: {
  sessionId?: string;
  source?: Source;
  rootId?: string;
  sessions?: BackupSessionSelection[];
}): BackupMigrationHandoff {
  if ((context.sessions?.length ?? 0) > 0) {
    return {
      origin: "sessions",
      subtitle: `Back up ${context.sessions!.length} selected session${context.sessions!.length === 1 ? "" : "s"} from Sessions.`,
      continueLabel: "Use the bulk session backup workflow to preserve the selected session set.",
      returnLabel: "Return to Sessions for evidence review.",
      workflowType: "bulk-session-backup",
      sessions: context.sessions,
    };
  }

  return {
    origin: "sessions",
    subtitle: `Back up session ${context.sessionId} from Sessions.`,
    continueLabel: "Use the session backup workflow to preserve this session record.",
    returnLabel: "Return to the originating session for evidence review.",
    workflowType: "session-backup",
    sessionId: context.sessionId,
    source: context.source,
    rootId: context.rootId,
  };
}

export function buildBackupHandoffFromOverview(workflowType: BackupWorkflowType): BackupMigrationHandoff {
  const subtitles = {
    "session-backup": "Start a bounded session backup workflow from Project Overview.",
    "bulk-session-backup": "Start a bounded bulk session backup workflow from Project Overview.",
    "import-backup": "Start a bounded import workflow from Project Overview.",
    "validate-package": "Start a bounded package validation workflow from Project Overview.",
    "migration-preview": "Start a bounded migration preview workflow from Project Overview.",
    "project-bundle": "Start a bounded project bundle workflow from Project Overview.",
  } satisfies Record<BackupWorkflowType, string>;

  return {
    origin: "overview",
    subtitle: subtitles[workflowType],
    continueLabel: "Workflow execution belongs to Backup / Migration.",
    returnLabel: "Return to Project Overview.",
    workflowType,
    projectBundleScopeHint: workflowType === "project-bundle" ? "overview-routed project context" : undefined,
    migrationPreviewSourceContext: workflowType === "migration-preview" ? { kind: "project-overview" } : undefined,
  };
}

export function buildAnalysisFoundationInstanceKey(handoff: AnalysisHandoff | null): string {
  if (!handoff) return "analysis:no-handoff";

  return [
    "analysis",
    handoff.origin,
    handoff.issueClass ?? "all-classes",
    handoff.severity ?? "all-severities",
    handoff.objectType ?? "all-objects",
    handoff.status ?? "all-statuses",
    handoff.findingId ?? "no-finding",
    handoff.assetId ?? "no-asset",
    handoff.assetSubtype ?? "no-subtype",
    handoff.sessionId ?? "no-session",
    handoff.source ?? "no-source",
    handoff.rootId ?? "no-root",
    handoff.issueLabel ?? "no-issue",
  ].join(":");
}

function clearSessionViewerUrlState(): void {
  if (typeof window === "undefined") return;

  cancelPendingUrlSync();

  const nextSearch = stripSessionViewerSearchParams(window.location.search);
  if (nextSearch === window.location.search) return;

  const url = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", url);
}

function formatSourceLabel(source: Source): string {
  if (source === "antigravity") return "Antigravity";
  if (source === "windsurf") return "Windsurf";
  return "Codex";
}

function formatCompactLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ProjectOverviewEmptyModule(props: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/25 p-4 text-sm text-muted">
      <div className="font-medium text-foreground">{props.title}</div>
      <p className="mt-1 leading-6">{props.body}</p>
    </div>
  );
}

function ProjectOverviewSnapshotCueButton(props: {
  cue: ProjectOverviewSnapshotCue;
  onRoute(route: ProjectOverviewRoute): void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onRoute(props.cue.route)}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors hover:border-accent/50",
        props.cue.status === "issue"
          ? "border-warn/50 bg-warn/10"
          : props.cue.status === "unknown"
            ? "border-border/70 bg-background/25"
            : "border-border/70 bg-background/35"
      )}
    >
      <div className="text-xs uppercase tracking-[0.18em] text-muted">{props.cue.label}</div>
      <div className="mt-1 text-lg font-semibold">{props.cue.value}</div>
      <p className="mt-1 text-xs leading-5 text-muted">{props.cue.detail}</p>
      <div className="mt-3 text-xs font-medium text-accent">{props.cue.route.label}</div>
    </button>
  );
}

function ProjectOverviewAssetButton(props: {
  asset: ProjectOverviewAssetSummary;
  onRoute(route: ProjectOverviewRoute): void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onRoute(props.asset.route)}
      className="rounded-xl border border-border/70 bg-background/35 p-3 text-left transition-colors hover:border-accent/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={props.asset.status === "active" ? "ok" : "warn"}>{formatCompactLabel(props.asset.status)}</Badge>
        <Badge variant="default">{formatCompactLabel(props.asset.subtype)}</Badge>
        <Badge variant="default">{formatCompactLabel(props.asset.scope)}</Badge>
      </div>
      <div className="mt-2 font-medium">{props.asset.title}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{props.asset.usageCue}</p>
      <div className="mt-3 text-xs font-medium text-accent">Open in Assets</div>
    </button>
  );
}

function ProjectOverviewSessionButton(props: {
  session: ProjectOverviewSessionSummary;
  onRoute(route: ProjectOverviewRoute): void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onRoute(props.session.route)}
      className="rounded-xl border border-border/70 bg-background/35 p-3 text-left transition-colors hover:border-accent/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{formatSourceLabel(props.session.source)}</Badge>
        <Badge variant="default">{props.session.recencyCue}</Badge>
      </div>
      <div className="mt-2 font-medium">{props.session.title}</div>
      <p className="mt-1 text-xs leading-5 text-muted">{props.session.statusCue}</p>
      <div className="mt-3 text-xs font-medium text-accent">Open in Sessions</div>
    </button>
  );
}

function ProjectOverviewAttentionButton(props: {
  item: ProjectOverviewAttentionItem;
  onRoute(route: ProjectOverviewRoute): void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onRoute(props.item.route)}
      className="rounded-xl border border-warn/45 bg-warn/10 p-3 text-left transition-colors hover:border-warn/70"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={props.item.severity === "high" ? "warn" : "default"}>
          {formatCompactLabel(props.item.severity)}
        </Badge>
        <Badge variant="default">{formatCompactLabel(props.item.issueClass)}</Badge>
        <Badge variant="default">{formatCompactLabel(props.item.affectedObjectType)}</Badge>
      </div>
      <div className="mt-2 font-medium">{props.item.title}</div>
      <p className="mt-1 text-xs leading-5 text-muted">{props.item.reason}</p>
      <div className="mt-3 text-xs font-medium text-accent">{props.item.route.label}</div>
    </button>
  );
}

function ProjectOverviewQuickActionButton(props: {
  action: ProjectOverviewQuickAction;
  onRoute(route: ProjectOverviewRoute): void;
}) {
  return (
    <Button
      className="h-auto w-full justify-start whitespace-normal text-left"
      variant="outline"
      size="sm"
      onClick={() => props.onRoute(props.action.route)}
    >
      <span>
        <span className="block font-medium">{props.action.label}</span>
        <span className="block text-xs font-normal text-muted">{props.action.detail}</span>
      </span>
    </Button>
  );
}

export function ProjectOverviewSurface(props: {
  summary?: ProjectOverviewSummary;
  onRoute(route: ProjectOverviewRoute): void;
}) {
  const summary = props.summary ?? deriveProjectOverviewSummary();
  const issueState = summary.state === "issue";
  const loadingState = summary.state === "loading";
  const emptyState = summary.state === "no-project-context";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={issueState ? "warn" : emptyState ? "default" : "ok"}>
              {issueState ? "attention state" : emptyState ? "no project context" : "governance foundation"}
            </Badge>
            <Badge variant="default">{summary.identity.scopeLabel}</Badge>
          </div>
          <h2 className="text-xl font-semibold">{summary.identity.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Project-scoped agent context governance derived from local evidence. Use this surface to see what context is
            present, what is in effect, what changed recently, what needs attention, and where to continue.
          </p>
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">{summary.identity.evidenceLabel}</div>
        </Card>

        {loadingState ? (
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Loading Project Overview</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {["Context Snapshot", "In-Effect Assets", "Recent Sessions", "Attention Needed"].map((label) => (
                <div key={label} className="h-24 animate-pulse rounded-xl border border-border/70 bg-background/40 p-3">
                  <div className="text-sm font-medium text-muted">{label}</div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted">Context Snapshot</div>
          <h3 className="mt-2 font-semibold">Current project-scoped agent context</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.contextSnapshot.map((cue) => (
              <ProjectOverviewSnapshotCueButton key={cue.id} cue={cue} onRoute={props.onRoute} />
            ))}
          </div>
        </Card>

        {issueState ? (
          <Card className="border-warn/45 bg-warn/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Attention Needed</div>
            <h3 className="mt-2 font-semibold">Highest-priority governance issues</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Compact issue cues only. Open the owning surface for findings, object review, session evidence, or backup workflow state.
            </p>
            <div className="mt-4 grid gap-3">
              {summary.attentionItems.length > 0 ? (
                summary.attentionItems.map((item) => (
                  <ProjectOverviewAttentionButton key={item.id} item={item} onRoute={props.onRoute} />
                ))
              ) : (
                <ProjectOverviewEmptyModule
                  title="No current attention items"
                  body="No local issue evidence is available, so Overview will not invent project problems."
                />
              )}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">In-Effect Assets</div>
            <h3 className="mt-2 font-semibold">Reusable context currently in effect</h3>
            <div className="mt-4 grid gap-3">
              {summary.inEffectAssets.length > 0 ? (
                summary.inEffectAssets.map((asset) => (
                  <ProjectOverviewAssetButton key={asset.id} asset={asset} onRoute={props.onRoute} />
                ))
              ) : (
                <ProjectOverviewEmptyModule
                  title="No in-effect assets"
                  body="No reusable context assets are currently marked in effect from available local evidence."
                />
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Recent Sessions</div>
            <h3 className="mt-2 font-semibold">Compact session activity cues</h3>
            <div className="mt-4 grid gap-3">
              {summary.recentSessions.length > 0 ? (
                summary.recentSessions.map((session) => (
                  <ProjectOverviewSessionButton key={`${session.source}:${session.rootId ?? "no-root"}:${session.id}`} session={session} onRoute={props.onRoute} />
                ))
              ) : (
                <ProjectOverviewEmptyModule
                  title="No recent sessions"
                  body="No session references are available from the current project context."
                />
              )}
            </div>
          </Card>
        </div>

        {!issueState ? (
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Attention Needed</div>
            <h3 className="mt-2 font-semibold">Governance issue summary</h3>
            <div className="mt-4 grid gap-3">
              {summary.attentionItems.length > 0 ? (
                summary.attentionItems.map((item) => (
                  <ProjectOverviewAttentionButton key={item.id} item={item} onRoute={props.onRoute} />
                ))
              ) : (
                <ProjectOverviewEmptyModule
                  title="No current attention items"
                  body="No unresolved issue evidence is available, so Overview will not create synthetic findings."
                />
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <Card className="p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Quick Actions</div>
        <h3 className="mt-2 font-semibold">Route-first next steps</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Actions open existing pages or bounded workflow entries. Overview does not run workflows or expose internals.
        </p>
        <div className="mt-4 space-y-2">
          {summary.quickActions.map((action) => (
            <ProjectOverviewQuickActionButton key={action.id} action={action} onRoute={props.onRoute} />
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Scope boundary: no runtime orchestration, cross-agent sync, migration apply, vendor-runtime restore, cloud sync,
          privacy redaction, full transcript rendering, full asset inventory, findings table, or workflow execution body.
        </p>
      </Card>
    </div>
  );
}

function PlaceholderSurface(props: {
  title: string;
  label: string;
  body: string;
  preservedPath: string;
  onNavigateSessions: () => void;
  cue?: PlaceholderCue;
  actionLabel?: string;
  onAction?(): void;
}) {
  return (
    <Card className="p-5">
      {props.cue ? (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/8 p-4 text-sm text-muted">
          <div className="font-medium text-foreground">{props.cue.title}</div>
          <div className="mt-1 leading-6">{props.cue.body}</div>
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="default">{props.label}</Badge>
        <Badge variant="warn">foundation placeholder</Badge>
      </div>
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{props.body}</p>
      <div className="mt-5 rounded-lg border border-border/70 bg-background/35 p-4 text-sm text-muted">
        Current working path: {props.preservedPath}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {props.onAction && props.actionLabel ? (
          <Button variant="outline" size="sm" onClick={props.onAction}>
            {props.actionLabel}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={props.onNavigateSessions}>
          Return to Sessions
        </Button>
      </div>
    </Card>
  );
}

export default function ProjectShellClient() {
  const [activePage, setActivePage] = useState<ProjectShellPage>("overview");
  const [externalSelection, setExternalSelection] = useState<HomeClientExternalSelection | null>(null);
  const [assetsHandoff, setAssetsHandoff] = useState<AssetsHandoff | null>(null);
  const [analysisHandoff, setAnalysisHandoff] = useState<AnalysisHandoff | null>(null);
  const [backupHandoff, setBackupHandoff] = useState<BackupMigrationHandoff | null>(null);

  const leaveSessionsSurface = useCallback(() => {
    clearSessionViewerUrlState();
    setExternalSelection(null);
  }, []);

  useEffect(() => {
    setActivePage(resolveInitialProjectShellPage(window.location.search));
  }, []);

  const handleSearchSelect = useCallback((sessionId: string, source: Source, rootId?: string) => {
    setAssetsHandoff(null);
    setAnalysisHandoff(null);
    setBackupHandoff(null);
    setActivePage("sessions");
    setExternalSelection((prev) =>
      buildExternalSessionSelection({
        requestId: (prev?.requestId ?? 0) + 1,
        sessionId,
        source,
        rootId,
      })
    );
  }, []);

  const handleNavigate = useCallback((page: ProjectShellPage) => {
    if (page !== "sessions") leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisHandoff(null);
    setBackupHandoff(null);
    setActivePage(page);
  }, [leaveSessionsSurface]);

  const handleOpenAssets = useCallback((handoff: AssetsHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(handoff);
    setAnalysisHandoff(null);
    setBackupHandoff(null);
    setActivePage("assets");
  }, [leaveSessionsSurface]);

  const handleOpenAssetsFromSession = useCallback((handoff: HomeClientAssetHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(buildAssetsHandoffFromSession({ sessionId: handoff.sessionId, subtype: handoff.subtype }));
    setAnalysisHandoff(null);
    setBackupHandoff(null);
    setActivePage("assets");
  }, [leaveSessionsSurface]);

  const handleOpenAnalysisFromSession = useCallback((handoff: HomeClientSessionHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisHandoff(buildAnalysisHandoffFromSession(handoff));
    setBackupHandoff(null);
    setActivePage("analysis");
  }, [leaveSessionsSurface]);

  const handleOpenSessionFromContext = useCallback((selection: { sessionId: string; source: Source; rootId?: string }) => {
    setAssetsHandoff(null);
    setAnalysisHandoff(null);
    setBackupHandoff(null);
    setActivePage("sessions");
    setExternalSelection((prev) =>
      buildExternalSessionSelection({
        requestId: (prev?.requestId ?? 0) + 1,
        sessionId: selection.sessionId,
        source: selection.source,
        rootId: selection.rootId,
      })
    );
  }, []);

  const handleOpenAnalysisFromAssets = useCallback((context: {
    issueLabel: string;
    assetId?: string;
    subtype?: ContextAssetSubtype;
    status?: ContextAssetStatus;
  }) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setBackupHandoff(null);
    setAnalysisHandoff(buildAnalysisHandoffFromAssets(context));
    setActivePage("analysis");
  }, [leaveSessionsSurface]);

  const handleOpenBackupFromAssets = useCallback((context: { assetId?: string; subtype?: ContextAssetSubtype; workflowType?: "migration-preview" | "project-bundle" }) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisHandoff(null);
    setBackupHandoff(buildBackupHandoffFromAssets(context));
    setActivePage("backup");
  }, [leaveSessionsSurface]);

  const handleOpenAnalysis = useCallback((handoff: AnalysisHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisHandoff(handoff);
    setBackupHandoff(null);
    setActivePage("analysis");
  }, [leaveSessionsSurface]);

  const handleOpenBackupFromAnalysis = useCallback((context: {
    findingId: string;
    title: string;
    preservationWarning?: string;
    routeLabel?: string;
    backupWorkflowType?: "session-backup" | "migration-preview" | "project-bundle";
  }) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisHandoff(null);
    setBackupHandoff(buildBackupHandoffFromAnalysis(context));
    setActivePage("backup");
  }, [leaveSessionsSurface]);

  const handleOpenBackup = useCallback((handoff: BackupMigrationHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisHandoff(null);
    setBackupHandoff(handoff);
    setActivePage("backup");
  }, [leaveSessionsSurface]);

  const handleOpenOverviewRoute = useCallback((route: ProjectOverviewRoute) => {
    if (route.target === "sessions") {
      setAssetsHandoff(null);
      setAnalysisHandoff(null);
      setBackupHandoff(null);
      setActivePage("sessions");
      if (route.sessionId && route.source) {
        setExternalSelection((prev) =>
          buildExternalSessionSelection({
            requestId: (prev?.requestId ?? 0) + 1,
            sessionId: route.sessionId!,
            source: route.source!,
            rootId: route.rootId,
          })
        );
      }
      return;
    }

    if (route.target === "assets") {
      handleOpenAssets(
        buildAssetsHandoffFromOverview({
          subtitle: route.subtitle ?? "Review reusable context assets from Project Overview.",
          subtype: route.subtype,
          scope: route.scope,
          status: route.status,
          assetId: route.assetId,
          issueLabel: route.issueLabel,
        })
      );
      return;
    }

    if (route.target === "analysis") {
      handleOpenAnalysis(
        buildAnalysisHandoffFromOverview({
          subtitle: route.subtitle ?? "Review project-level issue context from Project Overview.",
          issueClass: route.issueClass,
          severity: route.severity,
          objectType: route.objectType,
          status: route.findingStatus,
          findingId: route.findingId,
          issueLabel: route.issueLabel,
        })
      );
      return;
    }

    if (route.target === "backup" && route.workflowType) {
      handleOpenBackup(buildBackupHandoffFromOverview(route.workflowType));
      return;
    }

    handleNavigate("backup");
  }, [handleNavigate, handleOpenAnalysis, handleOpenAssets, handleOpenBackup]);

  const activeNav = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4">
        <header className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">Agent Context Insightor</h1>
                <Badge variant="ok">local-first</Badge>
                <Badge variant="default">project shell</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                Project view for agent sessions, context assets, analysis, and backup workflows.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <GlobalSearch onSelect={handleSearchSelect} />
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">Settings</Link>
              </Button>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Project sections">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "min-w-fit rounded-xl border px-3 py-2 text-left transition-colors",
                  item.id === activePage
                    ? "border-accent/70 bg-accent/15 text-foreground"
                    : "border-border/60 bg-background/30 text-muted hover:border-accent/40 hover:text-foreground"
                )}
                aria-current={item.id === activePage ? "page" : undefined}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-75">{item.eyebrow}</div>
                <div className="text-sm font-medium">{item.label}</div>
              </button>
            ))}
          </nav>
        </header>

        <main className="min-w-0">
          {activePage !== "sessions" ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted">Current Surface</div>
                <div className="font-semibold">{activeNav.label}</div>
              </div>
              <Badge variant="default">{activeNav.eyebrow}</Badge>
            </div>
          ) : null}

          {activePage === "overview" ? (
            <ProjectOverviewSurface
              onRoute={handleOpenOverviewRoute}
            />
          ) : null}
          {activePage === "sessions" ? (
            <HomeClient
              chrome="embedded"
              externalSelection={externalSelection}
              onOpenAssetsForSession={handleOpenAssetsFromSession}
              onOpenAnalysisForSession={handleOpenAnalysisFromSession}
              onOpenBackupForSession={(handoff) => handleOpenBackup(buildBackupHandoffFromSessions(handoff))}
            />
          ) : null}
          {activePage === "assets" ? (
            <AssetsFoundation
              key={buildAssetsFoundationInstanceKey(assetsHandoff)}
              handoff={assetsHandoff}
              onOpenSession={handleOpenSessionFromContext}
              onOpenAnalysis={handleOpenAnalysisFromAssets}
              onOpenBackup={handleOpenBackupFromAssets}
            />
          ) : null}
          {activePage === "analysis" ? (
            <AnalysisFoundation
              key={buildAnalysisFoundationInstanceKey(analysisHandoff)}
              handoff={analysisHandoff}
              onOpenAssets={handleOpenAssets}
              onOpenBackup={handleOpenBackupFromAnalysis}
              onOpenOverview={() => handleNavigate("overview")}
              onOpenSession={handleOpenSessionFromContext}
            />
          ) : null}
          {activePage === "backup" ? (
            <BackupMigrationFoundation
              key={buildBackupHandoffInstanceKey(backupHandoff)}
              handoff={backupHandoff}
              onNavigateSessions={() => handleNavigate("sessions")}
              onNavigateOverview={() => handleNavigate("overview")}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
