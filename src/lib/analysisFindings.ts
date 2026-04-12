import type { AssetsHandoff, ContextAssetStatus, ContextAssetSubtype } from "@/lib/contextAssets";
import type { Source } from "@/lib/types";

export const ANALYSIS_ISSUE_CLASSES = ["provenance", "stale", "conflict", "preservation", "unknown"] as const;
export const ANALYSIS_SEVERITIES = ["high", "medium", "low", "unknown"] as const;
export const ANALYSIS_FINDING_STATUSES = ["open", "watching", "resolved", "unknown"] as const;
export const ANALYSIS_OBJECT_TYPES = ["session", "asset", "backup", "project", "unknown"] as const;
export const ANALYSIS_ROUTE_TARGETS = ["sessions", "assets", "backup", "overview"] as const;

export type AnalysisIssueClass = (typeof ANALYSIS_ISSUE_CLASSES)[number];
export type AnalysisSeverity = (typeof ANALYSIS_SEVERITIES)[number];
export type AnalysisFindingStatus = (typeof ANALYSIS_FINDING_STATUSES)[number];
export type AnalysisObjectType = (typeof ANALYSIS_OBJECT_TYPES)[number];
export type AnalysisRouteTarget = (typeof ANALYSIS_ROUTE_TARGETS)[number];
export type AnalysisHandoffOrigin = "assets" | "overview" | "sessions";
export type AnalysisSurfaceState = "loading" | "empty" | "normal" | "selected" | "issue-heavy";

export type AnalysisEvidenceReference = {
  label: string;
  target: "session" | "asset" | "backup" | "source" | "unknown";
  sessionId?: string;
  assetId?: string;
  source?: Source;
  rootId?: string;
};

export type AnalysisRoute = {
  target: AnalysisRouteTarget;
  label: string;
  reason: string;
  sessionId?: string;
  source?: Source;
  rootId?: string;
  assetId?: string;
  assetSubtype?: ContextAssetSubtype;
  assetStatus?: ContextAssetStatus;
  preservationWarning?: string;
};

export type AnalysisFinding = {
  id: string;
  title: string;
  issueClass: AnalysisIssueClass;
  severity: AnalysisSeverity;
  status: AnalysisFindingStatus;
  affectedObjectType: AnalysisObjectType;
  affectedObjectLabel: string;
  whyItMatters: string;
  evidence: AnalysisEvidenceReference[];
  routes: AnalysisRoute[];
  preservationWarning?: string;
};

export type AnalysisFindingInput = {
  id: string;
  title: string;
  issueClass?: string | null;
  severity?: string | null;
  status?: string | null;
  affectedObjectType?: string | null;
  affectedObjectLabel?: string | null;
  whyItMatters?: string | null;
  evidence?: AnalysisEvidenceReference[] | null;
  routes?: AnalysisRoute[] | null;
  preservationWarning?: string | null;
};

export type AnalysisFilters = {
  issueClass: AnalysisIssueClass | "all";
  severity: AnalysisSeverity | "all";
  objectType: AnalysisObjectType | "all";
  status: AnalysisFindingStatus | "all";
};

export type AnalysisSummary = {
  total: number;
  highSeverity: number;
  preservationSensitive: number;
  issueClassCounts: Record<AnalysisIssueClass, number>;
  severityCounts: Record<AnalysisSeverity, number>;
};

export type AnalysisHandoff = {
  origin: AnalysisHandoffOrigin;
  subtitle: string;
  continueLabel?: string;
  returnLabel?: string;
  issueClass?: AnalysisIssueClass;
  severity?: AnalysisSeverity;
  objectType?: AnalysisObjectType;
  status?: AnalysisFindingStatus;
  findingId?: string;
  assetId?: string;
  assetSubtype?: ContextAssetSubtype;
  sessionId?: string;
  source?: Source;
  rootId?: string;
  issueLabel?: string;
};

export function normalizeAnalysisIssueClass(input?: string | null): AnalysisIssueClass {
  if (!input) return "unknown";
  return ANALYSIS_ISSUE_CLASSES.includes(input as AnalysisIssueClass) ? (input as AnalysisIssueClass) : "unknown";
}

export function normalizeAnalysisSeverity(input?: string | null): AnalysisSeverity {
  if (!input) return "unknown";
  return ANALYSIS_SEVERITIES.includes(input as AnalysisSeverity) ? (input as AnalysisSeverity) : "unknown";
}

export function normalizeAnalysisFindingStatus(input?: string | null): AnalysisFindingStatus {
  if (!input) return "unknown";
  return ANALYSIS_FINDING_STATUSES.includes(input as AnalysisFindingStatus) ? (input as AnalysisFindingStatus) : "unknown";
}

export function normalizeAnalysisObjectType(input?: string | null): AnalysisObjectType {
  if (!input) return "unknown";
  return ANALYSIS_OBJECT_TYPES.includes(input as AnalysisObjectType) ? (input as AnalysisObjectType) : "unknown";
}

export function normalizeAnalysisFinding(input: AnalysisFindingInput): AnalysisFinding {
  return {
    id: input.id,
    title: input.title,
    issueClass: normalizeAnalysisIssueClass(input.issueClass),
    severity: normalizeAnalysisSeverity(input.severity),
    status: normalizeAnalysisFindingStatus(input.status),
    affectedObjectType: normalizeAnalysisObjectType(input.affectedObjectType),
    affectedObjectLabel: input.affectedObjectLabel?.trim() || "Affected object unavailable.",
    whyItMatters: input.whyItMatters?.trim() || "Impact explanation unavailable.",
    evidence: input.evidence ?? [],
    routes: input.routes ?? [],
    ...(input.preservationWarning?.trim() ? { preservationWarning: input.preservationWarning.trim() } : {}),
  };
}

export function createDefaultAnalysisFilters(): AnalysisFilters {
  return {
    issueClass: "all",
    severity: "all",
    objectType: "all",
    status: "open",
  };
}

export function createAnalysisFindingSeeds(): AnalysisFinding[] {
  return [
    normalizeAnalysisFinding({
      id: "finding-preserve-before-migration",
      title: "Preserve session evidence before migration cleanup",
      issueClass: "preservation",
      severity: "high",
      status: "open",
      affectedObjectType: "backup",
      affectedObjectLabel: "Session backup set",
      whyItMatters: "Migration or cleanup work can destroy the evidence needed to explain source-specific session behavior.",
      evidence: [
        {
          label: "Backup-related failure session",
          target: "session",
          sessionId: "session-command-antigravity-4",
          source: "antigravity",
        },
      ],
      routes: [
        {
          target: "backup",
          label: "Preserve in Backup / Migration",
          reason: "Preserve source evidence before changing backup or migration state.",
          preservationWarning: "Preserve before destructive cleanup or migration changes.",
        },
        {
          target: "sessions",
          label: "Open affected session",
          reason: "Inspect the failure evidence that triggered the preservation warning.",
          sessionId: "session-command-antigravity-4",
          source: "antigravity",
        },
      ],
      preservationWarning: "Preserve before risky migration or cleanup work.",
    }),
    normalizeAnalysisFinding({
      id: "finding-conflicted-skill",
      title: "Conflicted OpenSpec helper skill",
      issueClass: "conflict",
      severity: "high",
      status: "open",
      affectedObjectType: "asset",
      affectedObjectLabel: "OpenSpec apply helper skill",
      whyItMatters: "Multiple local copies disagree, so agents may follow different implementation workflow rules.",
      evidence: [
        {
          label: "Conflicted generated skill",
          target: "asset",
          assetId: "asset-skill-global-generated",
        },
      ],
      routes: [
        {
          target: "assets",
          label: "Open affected asset",
          reason: "Review the conflicting skill object and its provenance.",
          assetId: "asset-skill-global-generated",
          assetSubtype: "skill",
          assetStatus: "conflicted",
        },
      ],
    }),
    normalizeAnalysisFinding({
      id: "finding-stale-memory",
      title: "Stale review preference memory",
      issueClass: "stale",
      severity: "medium",
      status: "open",
      affectedObjectType: "asset",
      affectedObjectLabel: "User review preference memory",
      whyItMatters: "A stale memory can bias future review decisions if it is not confirmed against current project practice.",
      evidence: [
        {
          label: "Related Windsurf session",
          target: "session",
          sessionId: "session-memory-windsurf-2",
          source: "windsurf",
        },
        {
          label: "Stale memory asset",
          target: "asset",
          assetId: "asset-memory-user-windsurf",
        },
      ],
      routes: [
        {
          target: "assets",
          label: "Review memory asset",
          reason: "Inspect the stale memory object before deciding whether it still applies.",
          assetId: "asset-memory-user-windsurf",
          assetSubtype: "memory",
          assetStatus: "stale",
        },
        {
          target: "sessions",
          label: "Open source session",
          reason: "Check the session evidence behind the stale memory.",
          sessionId: "session-memory-windsurf-2",
          source: "windsurf",
        },
      ],
    }),
    normalizeAnalysisFinding({
      id: "finding-missing-provenance",
      title: "Imported context fragment has missing provenance",
      issueClass: "provenance",
      severity: "medium",
      status: "watching",
      affectedObjectType: "asset",
      affectedObjectLabel: "Imported context package fragment",
      whyItMatters: "Unknown provenance makes it harder to decide whether imported context should influence project work.",
      evidence: [
        {
          label: "Imported unknown asset",
          target: "asset",
          assetId: "asset-unknown-imported-1",
        },
      ],
      routes: [
        {
          target: "assets",
          label: "Open imported asset",
          reason: "Inspect missing metadata and available source context.",
          assetId: "asset-unknown-imported-1",
          assetSubtype: "unknown",
          assetStatus: "unknown",
        },
      ],
    }),
    normalizeAnalysisFinding({
      id: "finding-project-rule-active",
      title: "Project coding rules are active and traceable",
      issueClass: "provenance",
      severity: "low",
      status: "resolved",
      affectedObjectType: "asset",
      affectedObjectLabel: "Project coding rules",
      whyItMatters: "This object is included as a low-risk baseline for normal analysis filtering and selected-detail states.",
      evidence: [
        {
          label: "Traceable rule asset",
          target: "asset",
          assetId: "asset-rule-project-codex",
        },
      ],
      routes: [
        {
          target: "assets",
          label: "Open rule asset",
          reason: "Review the traceable in-effect rule object.",
          assetId: "asset-rule-project-codex",
          assetSubtype: "rule",
          assetStatus: "active",
        },
      ],
    }),
    normalizeAnalysisFinding({
      id: "finding-unknown-import",
      title: "Unknown imported context requires classification",
      issueClass: undefined,
      severity: undefined,
      status: undefined,
      affectedObjectType: undefined,
      affectedObjectLabel: null,
      whyItMatters: null,
      evidence: [],
      routes: [],
    }),
  ];
}

export function applyAnalysisFilters(findings: AnalysisFinding[], filters: AnalysisFilters): AnalysisFinding[] {
  return findings.filter((finding) => {
    if (filters.issueClass !== "all" && finding.issueClass !== filters.issueClass) return false;
    if (filters.severity !== "all" && finding.severity !== filters.severity) return false;
    if (filters.objectType !== "all" && finding.affectedObjectType !== filters.objectType) return false;
    if (filters.status !== "all" && finding.status !== filters.status) return false;
    return true;
  });
}

export function summarizeAnalysisFindings(findings: AnalysisFinding[]): AnalysisSummary {
  const issueClassCounts = Object.fromEntries(ANALYSIS_ISSUE_CLASSES.map((key) => [key, 0])) as Record<AnalysisIssueClass, number>;
  const severityCounts = Object.fromEntries(ANALYSIS_SEVERITIES.map((key) => [key, 0])) as Record<AnalysisSeverity, number>;
  let highSeverity = 0;
  let preservationSensitive = 0;

  for (const finding of findings) {
    issueClassCounts[finding.issueClass] += 1;
    severityCounts[finding.severity] += 1;
    if (finding.severity === "high") highSeverity += 1;
    if (finding.preservationWarning || finding.routes.some((route) => route.preservationWarning)) {
      preservationSensitive += 1;
    }
  }

  return {
    total: findings.length,
    highSeverity,
    preservationSensitive,
    issueClassCounts,
    severityCounts,
  };
}

export function buildFiltersFromAnalysisHandoff(
  handoff: AnalysisHandoff | null,
  fallback?: AnalysisFilters | null
): AnalysisFilters {
  return {
    issueClass: handoff?.issueClass ?? fallback?.issueClass ?? "all",
    severity: handoff?.severity ?? fallback?.severity ?? "all",
    objectType: handoff?.objectType ?? fallback?.objectType ?? "all",
    status: handoff?.status ?? fallback?.status ?? "open",
  };
}

export function resolveAnalysisFindingSelection(
  findings: AnalysisFinding[],
  handoff: AnalysisHandoff | null
): AnalysisFinding | null {
  if (!handoff) return null;

  if (handoff.findingId) {
    const byFinding = findings.find((finding) => finding.id === handoff.findingId);
    if (byFinding) return byFinding;
  }

  if (handoff.assetId) {
    const byAsset = findings.find((finding) =>
      finding.evidence.some((evidence) => evidence.assetId === handoff.assetId) ||
      finding.routes.some((route) => route.assetId === handoff.assetId)
    );
    if (byAsset) return byAsset;
  }

  if (handoff.sessionId) {
    const matchesSessionIdentity = (
      item: { sessionId?: string; source?: string; rootId?: string }
    ) => {
      if (item.sessionId !== handoff.sessionId) return false;
      // When handoff provides source, item must have the same source
      if (handoff.source) {
        if (!item.source || item.source !== handoff.source) return false;
      }
      // When both handoff and item provide rootId, they must match
      // Item without rootId is treated as wildcard (matches any handoff rootId)
      if (handoff.rootId && item.rootId && item.rootId !== handoff.rootId) return false;
      return true;
    };

    const bySession = findings.find((finding) =>
      finding.evidence.some(matchesSessionIdentity) ||
      finding.routes.some(matchesSessionIdentity)
    );
    if (bySession) return bySession;
  }

  return null;
}

export function deriveAnalysisSurfaceState(input: {
  isLoading: boolean;
  filteredFindings: AnalysisFinding[];
  selectedFindingId?: string | null;
}): AnalysisSurfaceState {
  if (input.isLoading) return "loading";
  if (input.filteredFindings.length === 0) return "empty";

  const selected = input.selectedFindingId
    ? input.filteredFindings.find((finding) => finding.id === input.selectedFindingId)
    : undefined;
  const hasPreservationWarning = (finding: AnalysisFinding) =>
    Boolean(finding.preservationWarning) || finding.routes.some((route) => route.preservationWarning);

  const issueHeavy = input.filteredFindings.some(
    (finding) => finding.severity === "high" || hasPreservationWarning(finding)
  );

  if (selected && (selected.severity === "high" || hasPreservationWarning(selected))) return "issue-heavy";
  if (issueHeavy) return "issue-heavy";
  if (selected) return "selected";
  return "normal";
}

export function formatAnalysisIssueClassLabel(issueClass: AnalysisIssueClass): string {
  const labels: Record<AnalysisIssueClass, string> = {
    provenance: "Provenance",
    stale: "Stale",
    conflict: "Conflict",
    preservation: "Preservation",
    unknown: "Unknown",
  };
  return labels[issueClass];
}

export function formatAnalysisSeverityLabel(severity: AnalysisSeverity): string {
  const labels: Record<AnalysisSeverity, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
    unknown: "Unknown",
  };
  return labels[severity];
}

export function formatAnalysisFindingStatusLabel(status: AnalysisFindingStatus): string {
  const labels: Record<AnalysisFindingStatus, string> = {
    open: "Open",
    watching: "Watching",
    resolved: "Resolved",
    unknown: "Unknown",
  };
  return labels[status];
}

export function formatAnalysisObjectTypeLabel(objectType: AnalysisObjectType): string {
  const labels: Record<AnalysisObjectType, string> = {
    session: "Session",
    asset: "Asset",
    backup: "Backup",
    project: "Project",
    unknown: "Unknown",
  };
  return labels[objectType];
}

export function buildAssetsHandoffFromAnalysisRoute(route: AnalysisRoute, finding: AnalysisFinding): AssetsHandoff {
  return {
    origin: "analysis",
    subtitle: `Review affected asset from Analysis: ${finding.title}.`,
    continueLabel: route.reason,
    returnLabel: "Return to Analysis to continue grouped interpretation after object review.",
    subtype: route.assetSubtype,
    status: route.assetStatus,
    assetId: route.assetId,
    issueLabel: formatAnalysisIssueClassLabel(finding.issueClass),
  };
}

export function resolveAnalysisSessionRootId(input: {
  handoff: AnalysisHandoff | null;
  sessionId: string;
  source: Source;
  explicitRootId?: string;
}): string | undefined {
  if (input.explicitRootId) return input.explicitRootId;
  if (input.handoff?.sessionId !== input.sessionId) return undefined;
  if (input.handoff.source && input.handoff.source !== input.source) return undefined;
  return input.handoff.rootId;
}
