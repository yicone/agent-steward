import type {
  AnalysisFinding,
  AnalysisFindingStatus,
  AnalysisIssueClass,
  AnalysisObjectType,
  AnalysisRoute,
  AnalysisSeverity,
} from "@/lib/analysisFindings";
import { createAnalysisFindingSeeds, formatAnalysisIssueClassLabel, summarizeAnalysisFindings } from "@/lib/analysisFindings";
import type { BackupWorkflowType } from "@/lib/backupMigration";
import { BACKUP_WORKFLOW_TYPES, formatWorkflowTypeLabel } from "@/lib/backupMigration";
import type {
  ContextAsset,
  ContextAssetScope,
  ContextAssetStatus,
  ContextAssetSubtype,
} from "@/lib/contextAssets";
import { createContextAssetSeeds, isIssueContextAsset, summarizeContextAssets } from "@/lib/contextAssets";
import type { Source } from "@/lib/types";

export type ProjectOverviewPageState = "loading" | "no-project-context" | "normal" | "issue";
export type ProjectOverviewSnapshotStatus = "ok" | "issue" | "empty" | "unknown";
export type ProjectOverviewRouteTarget = "sessions" | "assets" | "analysis" | "backup";
export type ProjectOverviewModuleKind =
  | "context-snapshot"
  | "in-effect-assets"
  | "recent-sessions"
  | "attention-needed"
  | "quick-actions";

export type ProjectOverviewRoute = {
  target: ProjectOverviewRouteTarget;
  label: string;
  module: ProjectOverviewModuleKind;
  subtitle?: string;
  sessionId?: string;
  source?: Source;
  rootId?: string;
  subtype?: ContextAssetSubtype;
  scope?: ContextAssetScope;
  status?: ContextAssetStatus;
  assetId?: string;
  issueLabel?: string;
  issueClass?: AnalysisIssueClass;
  severity?: AnalysisSeverity;
  objectType?: AnalysisObjectType;
  findingStatus?: AnalysisFindingStatus;
  findingId?: string;
  workflowType?: BackupWorkflowType;
};

export type ProjectOverviewProjectIdentity = {
  title: string;
  scopeLabel: string;
  evidenceLabel: string;
  state: ProjectOverviewPageState;
};

export type ProjectOverviewSnapshotCue = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: ProjectOverviewSnapshotStatus;
  route: ProjectOverviewRoute;
};

export type ProjectOverviewAssetSummary = {
  id: string;
  title: string;
  subtype: ContextAssetSubtype;
  scope: ContextAssetScope;
  status: ContextAssetStatus;
  provenanceCue: string;
  usageCue: string;
  route: ProjectOverviewRoute;
};

export type ProjectOverviewSessionSummary = {
  id: string;
  title: string;
  source: Source;
  rootId?: string;
  recencyCue: string;
  statusCue: string;
  route: ProjectOverviewRoute;
};

export type ProjectOverviewAttentionItem = {
  id: string;
  title: string;
  severity: AnalysisSeverity;
  status: AnalysisFindingStatus;
  issueClass: AnalysisIssueClass;
  affectedObjectType: AnalysisObjectType;
  affectedObjectLabel: string;
  reason: string;
  route: ProjectOverviewRoute;
};

export type ProjectOverviewQuickAction = {
  id: string;
  label: string;
  detail: string;
  route: ProjectOverviewRoute;
};

export type ProjectOverviewSummary = {
  identity: ProjectOverviewProjectIdentity;
  contextSnapshot: ProjectOverviewSnapshotCue[];
  inEffectAssets: ProjectOverviewAssetSummary[];
  recentSessions: ProjectOverviewSessionSummary[];
  attentionItems: ProjectOverviewAttentionItem[];
  quickActions: ProjectOverviewQuickAction[];
  state: ProjectOverviewPageState;
  limits: {
    inEffectAssets: number;
    recentSessions: number;
    attentionItems: number;
    quickActions: number;
  };
};

export type ProjectOverviewSessionInput = {
  id: string;
  title?: string | null;
  source: Source;
  rootId?: string | null;
  recencyCue?: string | null;
  statusCue?: string | null;
};

export type ProjectOverviewSummaryInput = {
  isLoading?: boolean;
  projectTitle?: string | null;
  scopeLabel?: string | null;
  assets?: ContextAsset[] | null;
  assetsAvailable?: boolean;
  findings?: AnalysisFinding[] | null;
  analysisAvailable?: boolean;
  sessions?: ProjectOverviewSessionInput[] | null;
  sessionsAvailable?: boolean;
  backupWorkflows?: BackupWorkflowType[] | null;
  backupAvailable?: boolean;
  limits?: Partial<ProjectOverviewSummary["limits"]>;
};

const DEFAULT_LIMITS: ProjectOverviewSummary["limits"] = {
  inEffectAssets: 3,
  recentSessions: 3,
  attentionItems: 3,
  quickActions: 6,
};

const SEVERITY_PRIORITY: Record<AnalysisSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

const STATUS_PRIORITY: Record<AnalysisFindingStatus, number> = {
  open: 0,
  watching: 1,
  unknown: 2,
  resolved: 3,
};

const ISSUE_CLASS_PRIORITY: Record<AnalysisIssueClass, number> = {
  preservation: 0,
  conflict: 1,
  provenance: 2,
  stale: 3,
  unknown: 4,
};

const ACCEPTED_OVERVIEW_WORKFLOWS = new Set<BackupWorkflowType>(BACKUP_WORKFLOW_TYPES);

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function createRoute(input: Omit<ProjectOverviewRoute, "subtitle"> & { subtitle?: string }): ProjectOverviewRoute {
  return input;
}

function buildUnknownSnapshotCue(input: {
  id: string;
  label: string;
  detail: string;
  target: ProjectOverviewRouteTarget;
  module?: ProjectOverviewModuleKind;
}): ProjectOverviewSnapshotCue {
  return {
    id: input.id,
    label: input.label,
    value: "Unknown",
    detail: input.detail,
    status: "unknown",
    route: createRoute({
      target: input.target,
      label: `Review ${input.label.toLowerCase()}`,
      module: input.module ?? "context-snapshot",
      subtitle: input.detail,
    }),
  };
}

function normalizeWorkflowTypes(workflows: BackupWorkflowType[] | null | undefined): BackupWorkflowType[] {
  return Array.from(new Set((workflows ?? []).filter((workflow) => ACCEPTED_OVERVIEW_WORKFLOWS.has(workflow))));
}

function buildContextSnapshot(input: {
  assets: ContextAsset[];
  assetsAvailable: boolean;
  findings: AnalysisFinding[];
  analysisAvailable: boolean;
  sessions: ProjectOverviewSessionInput[];
  sessionsAvailable: boolean;
  backupWorkflows: BackupWorkflowType[];
  backupAvailable: boolean;
}): ProjectOverviewSnapshotCue[] {
  const cues: ProjectOverviewSnapshotCue[] = [];

  if (!input.sessionsAvailable) {
    cues.push(buildUnknownSnapshotCue({
      id: "sessions",
      label: "Sessions",
      detail: "Session provider evidence is unavailable.",
      target: "sessions",
    }));
  } else {
    cues.push({
      id: "sessions",
      label: "Sessions",
      value: plural(input.sessions.length, "session"),
      detail: input.sessions.length > 0 ? "Recent local session references are available." : "No local session references are available yet.",
      status: input.sessions.length > 0 ? "ok" : "empty",
      route: createRoute({
        target: "sessions",
        label: "Review sessions",
        module: "context-snapshot",
      }),
    });
  }

  if (!input.assetsAvailable) {
    cues.push(buildUnknownSnapshotCue({
      id: "assets",
      label: "Assets",
      detail: "Reusable context asset provider evidence is unavailable.",
      target: "assets",
    }));
  } else {
    const summary = summarizeContextAssets(input.assets);
    cues.push({
      id: "assets",
      label: "Reusable assets",
      value: plural(summary.total, "asset"),
      detail: summary.total === 0
        ? "No reusable context assets are available yet."
        : `${plural(summary.inEffect, "in-effect asset")} and ${plural(summary.issueCount, "asset issue")} from local project evidence.`,
      status: summary.issueCount > 0 ? "issue" : summary.total > 0 ? "ok" : "empty",
      route: createRoute({
        target: "assets",
        label: "Review reusable assets",
        module: "context-snapshot",
        subtitle: "Review reusable context assets from the Project Overview snapshot.",
      }),
    });
  }

  if (!input.analysisAvailable) {
    cues.push(buildUnknownSnapshotCue({
      id: "analysis",
      label: "Analysis",
      detail: "Analysis summary evidence is unavailable.",
      target: "analysis",
    }));
  } else {
    const summary = summarizeAnalysisFindings(input.findings);
    cues.push({
      id: "analysis",
      label: "Findings",
      value: plural(summary.total, "finding"),
      detail: summary.total === 0
        ? "No local analysis findings are available yet."
        : `${plural(summary.highSeverity, "high-priority finding")} and ${plural(summary.preservationSensitive, "preservation-sensitive item")}.`,
      status: summary.highSeverity > 0 || summary.preservationSensitive > 0 ? "issue" : summary.total > 0 ? "ok" : "empty",
      route: createRoute({
        target: "analysis",
        label: "Review findings",
        module: "context-snapshot",
        subtitle: "Review local context findings from the Project Overview snapshot.",
      }),
    });
  }

  if (!input.backupAvailable) {
    cues.push(buildUnknownSnapshotCue({
      id: "backup",
      label: "Backup readiness",
      detail: "Backup / Migration workflow evidence is unavailable.",
      target: "backup",
    }));
  } else {
    cues.push({
      id: "backup",
      label: "Backup readiness",
      value: plural(input.backupWorkflows.length, "workflow"),
      detail: input.backupWorkflows.length > 0
        ? "Bounded local workflow entry points are available in Backup / Migration."
        : "No backup or migration workflow entry points are currently available.",
      status: input.backupWorkflows.length > 0 ? "ok" : "empty",
      route: createRoute({
        target: "backup",
        label: "Open Backup / Migration",
        module: "context-snapshot",
      }),
    });
  }

  return cues;
}

function buildInEffectAssets(assets: ContextAsset[], limit: number): ProjectOverviewAssetSummary[] {
  return assets
    .filter((asset) => asset.usage.state === "in_effect")
    .slice(0, limit)
    .map((asset) => ({
      id: asset.id,
      title: asset.title,
      subtype: asset.subtype,
      scope: asset.scope,
      status: asset.status,
      provenanceCue: asset.provenance,
      usageCue: asset.usage.summary,
      route: createRoute({
        target: "assets",
        label: "Open asset",
        module: "in-effect-assets",
        subtitle: `Review in-effect ${asset.subtype} asset from Project Overview.`,
        subtype: asset.subtype,
        scope: asset.scope,
        status: asset.status,
        assetId: asset.id,
      }),
    }));
}

function buildRecentSessions(sessions: ProjectOverviewSessionInput[], limit: number): ProjectOverviewSessionSummary[] {
  return sessions.slice(0, limit).map((session) => ({
    id: session.id,
    title: session.title?.trim() || session.id,
    source: session.source,
    rootId: session.rootId?.trim() || undefined,
    recencyCue: session.recencyCue?.trim() || "Recency unavailable",
    statusCue: session.statusCue?.trim() || "Status unavailable",
    route: createRoute({
      target: "sessions",
      label: "Open session",
      module: "recent-sessions",
      sessionId: session.id,
      source: session.source,
      rootId: session.rootId?.trim() || undefined,
    }),
  }));
}

function routeFromAnalysisRoute(route: AnalysisRoute, finding: AnalysisFinding): ProjectOverviewRoute {
  if (route.target === "assets") {
    return createRoute({
      target: "assets",
      label: route.label,
      module: "attention-needed",
      subtitle: `Review affected asset from Project Overview: ${finding.title}.`,
      subtype: route.assetSubtype,
      status: route.assetStatus,
      assetId: route.assetId,
      issueLabel: formatAnalysisIssueClassLabel(finding.issueClass),
    });
  }

  if (route.target === "backup") {
    return createRoute({
      target: "backup",
      label: route.label,
      module: "attention-needed",
      workflowType: route.backupWorkflowType,
      findingId: finding.id,
      issueLabel: finding.title,
    });
  }

  if (route.target === "sessions") {
    return createRoute({
      target: "sessions",
      label: route.label,
      module: "attention-needed",
      sessionId: route.sessionId,
      source: route.source,
      rootId: route.rootId,
    });
  }

  return createRoute({
    target: "analysis",
    label: "Open finding",
    module: "attention-needed",
    subtitle: `Review project-level issue from Overview: ${finding.title}.`,
    issueClass: finding.issueClass,
    severity: finding.severity,
    objectType: finding.affectedObjectType,
    findingStatus: finding.status,
    findingId: finding.id,
    issueLabel: finding.title,
  });
}

function bestRouteForFinding(finding: AnalysisFinding): ProjectOverviewRoute {
  const preferredRoute =
    finding.routes.find((route) => route.target === "backup" && route.preservationWarning) ??
    finding.routes.find((route) => route.target === "assets") ??
    finding.routes.find((route) => route.target === "backup") ??
    finding.routes.find((route) => route.target === "sessions");

  return preferredRoute
    ? routeFromAnalysisRoute(preferredRoute, finding)
    : createRoute({
      target: "analysis",
      label: "Open finding",
      module: "attention-needed",
      subtitle: `Review project-level issue from Overview: ${finding.title}.`,
      issueClass: finding.issueClass,
      severity: finding.severity,
      objectType: finding.affectedObjectType,
      findingStatus: finding.status,
      findingId: finding.id,
      issueLabel: finding.title,
    });
}

function buildAttentionItems(input: {
  assets: ContextAsset[];
  findings: AnalysisFinding[];
  limit: number;
}): ProjectOverviewAttentionItem[] {
  const unresolvedFindings = input.findings.filter((finding) => finding.status !== "resolved");
  const analysisItems = unresolvedFindings
    .map<ProjectOverviewAttentionItem>((finding) => ({
      id: `finding:${finding.id}`,
      title: finding.title,
      severity: finding.severity,
      status: finding.status,
      issueClass: finding.issueClass,
      affectedObjectType: finding.affectedObjectType,
      affectedObjectLabel: finding.affectedObjectLabel,
      reason: finding.whyItMatters,
      route: bestRouteForFinding(finding),
    }));

  const findingAssetIds = new Set(
    unresolvedFindings.flatMap((finding) => [
      ...finding.evidence.map((evidence) => evidence.assetId).filter(Boolean),
      ...finding.routes.map((route) => route.assetId).filter(Boolean),
    ])
  );
  const assetIssueItems = input.assets
    .filter((asset) => isIssueContextAsset(asset) && !findingAssetIds.has(asset.id))
    .map<ProjectOverviewAttentionItem>((asset) => ({
      id: `asset:${asset.id}`,
      title: `${asset.title} needs review`,
      severity: asset.status === "conflicted" ? "high" : "medium",
      status: "open",
      issueClass: asset.status === "conflicted" ? "conflict" : asset.status === "stale" ? "stale" : "provenance",
      affectedObjectType: "asset",
      affectedObjectLabel: asset.title,
      reason: asset.usage.summary,
      route: createRoute({
        target: "assets",
        label: "Open affected asset",
        module: "attention-needed",
        subtitle: `Review affected asset from Project Overview: ${asset.title}.`,
        subtype: asset.subtype,
        status: asset.status,
        assetId: asset.id,
        issueLabel: asset.status,
      }),
    }));

  return [...analysisItems, ...assetIssueItems]
    .sort((a, b) =>
      SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity] ||
      STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
      ISSUE_CLASS_PRIORITY[a.issueClass] - ISSUE_CLASS_PRIORITY[b.issueClass] ||
      a.title.localeCompare(b.title)
    )
    .slice(0, input.limit);
}

function buildQuickActions(workflows: BackupWorkflowType[], limit: number): ProjectOverviewQuickAction[] {
  const routeActions: ProjectOverviewQuickAction[] = [
    {
      id: "review-sessions",
      label: "Review Sessions",
      detail: "Open session evidence without carrying transcript state through Overview.",
      route: createRoute({
        target: "sessions",
        label: "Review Sessions",
        module: "quick-actions",
      }),
    },
    {
      id: "inspect-assets",
      label: "Inspect Assets",
      detail: "Open reusable context assets with project-level framing.",
      route: createRoute({
        target: "assets",
        label: "Inspect Assets",
        module: "quick-actions",
        subtitle: "Inspect reusable context assets across the current project scope.",
      }),
    },
    {
      id: "review-analysis",
      label: "Review Analysis",
      detail: "Open grouped interpretation and route-only findings.",
      route: createRoute({
        target: "analysis",
        label: "Review Analysis",
        module: "quick-actions",
        subtitle: "Review local context findings across this project.",
      }),
    },
  ];
  const workflowActions = workflows.map<ProjectOverviewQuickAction>((workflowType) => ({
    id: `workflow:${workflowType}`,
    label: formatWorkflowTypeLabel(workflowType),
    detail: "Route into Backup / Migration; workflow state stays there.",
    route: createRoute({
      target: "backup",
      label: formatWorkflowTypeLabel(workflowType),
      module: "quick-actions",
      workflowType,
    }),
  }));

  return [...routeActions, ...workflowActions].slice(0, limit);
}

export function deriveProjectOverviewSummary(input: ProjectOverviewSummaryInput = {}): ProjectOverviewSummary {
  const limits = { ...DEFAULT_LIMITS, ...input.limits };
  const assetsAvailable = input.assetsAvailable ?? input.assets !== null;
  const analysisAvailable = input.analysisAvailable ?? input.findings !== null;
  const sessionsAvailable = input.sessionsAvailable ?? input.sessions !== null;
  const backupAvailable = input.backupAvailable ?? input.backupWorkflows !== null;
  const assets = assetsAvailable ? (input.assets ?? createContextAssetSeeds()) : [];
  const findings = analysisAvailable ? (input.findings ?? createAnalysisFindingSeeds()) : [];
  const sessions = sessionsAvailable ? (input.sessions ?? []) : [];
  const backupWorkflows = backupAvailable ? normalizeWorkflowTypes(input.backupWorkflows ?? [...BACKUP_WORKFLOW_TYPES]) : [];
  const contextSnapshot = buildContextSnapshot({
    assets,
    assetsAvailable,
    findings,
    analysisAvailable,
    sessions,
    sessionsAvailable,
    backupWorkflows,
    backupAvailable,
  });
  const inEffectAssets = assetsAvailable ? buildInEffectAssets(assets, limits.inEffectAssets) : [];
  const recentSessions = sessionsAvailable ? buildRecentSessions(sessions, limits.recentSessions) : [];
  const attentionItems = analysisAvailable || assetsAvailable
    ? buildAttentionItems({ assets, findings, limit: limits.attentionItems })
    : [];
  const quickActions = buildQuickActions(backupWorkflows, limits.quickActions);
  const hasProjectContext = assets.length > 0 || sessions.length > 0;
  const hasHighPriorityIssue = attentionItems.some((item) => item.severity === "high");
  const state: ProjectOverviewPageState = input.isLoading
    ? "loading"
    : !hasProjectContext
      ? "no-project-context"
      : hasHighPriorityIssue
        ? "issue"
        : "normal";

  return {
    identity: {
      title: input.projectTitle?.trim() || "Project Overview",
      scopeLabel: input.scopeLabel?.trim() || "Local project context",
      evidenceLabel: input.isLoading
        ? "Loading local project evidence"
        : state === "no-project-context"
          ? "No sessions or reusable assets found yet"
          : "Derived from local project evidence",
      state,
    },
    contextSnapshot,
    inEffectAssets,
    recentSessions,
    attentionItems,
    quickActions,
    state,
    limits,
  };
}
