import type { Source } from "@/lib/types";

export const CONTEXT_ASSET_SUBTYPES = ["rule", "memory", "skill", "command", "unknown"] as const;
export const CONTEXT_ASSET_SCOPES = ["global", "user", "project", "unknown"] as const;
export const CONTEXT_ASSET_SOURCES = ["antigravity", "windsurf", "codex", "imported", "generated", "unknown"] as const;
export const CONTEXT_ASSET_STATUSES = ["active", "stale", "conflicted", "orphaned", "archived", "unknown"] as const;

export type ContextAssetSubtype = (typeof CONTEXT_ASSET_SUBTYPES)[number];
export type ContextAssetScope = (typeof CONTEXT_ASSET_SCOPES)[number];
export type ContextAssetSource = (typeof CONTEXT_ASSET_SOURCES)[number];
export type ContextAssetStatus = (typeof CONTEXT_ASSET_STATUSES)[number];
export type ContextAssetUsageState = "in_effect" | "not_in_effect" | "unknown";

export type ContextAssetSourceReference = {
  label: string;
  target: "session" | "source" | "analysis" | "backup";
  sessionId?: string;
  source?: Source;
  rootId?: string;
  path?: string;
};

export type ContextAssetUsage = {
  state: ContextAssetUsageState;
  summary: string;
  relatedSessionIds?: string[];
  analysisLabel?: string;
};

export type ContextAsset = {
  id: string;
  title: string;
  subtype: ContextAssetSubtype;
  scope: ContextAssetScope;
  source: ContextAssetSource;
  status: ContextAssetStatus;
  provenance: string;
  bodySummary?: string;
  sourceReference?: ContextAssetSourceReference;
  usage?: ContextAssetUsage;
};

export type ContextAssetInput = {
  id: string;
  title: string;
  subtype?: string | null;
  scope?: string | null;
  source?: string | null;
  status?: string | null;
  provenance?: string | null;
  bodySummary?: string | null;
  sourceReference?: ContextAssetSourceReference | null;
  usage?: Partial<ContextAssetUsage> | null;
};

export type ContextAssetFilters = {
  subtype: ContextAssetSubtype | "all";
  scope: ContextAssetScope | "all";
  source: ContextAssetSource | "all";
  status: ContextAssetStatus | "all";
};

export type ContextAssetSummary = {
  total: number;
  inEffect: number;
  issueCount: number;
  subtypeCounts: Record<ContextAssetSubtype, number>;
  statusCounts: Record<ContextAssetStatus, number>;
};

export type AssetsHandoffOrigin = "sessions" | "overview" | "analysis";

export type AssetsHandoff = {
  origin: AssetsHandoffOrigin;
  subtitle: string;
  continueLabel?: string;
  returnLabel?: string;
  subtype?: ContextAssetSubtype;
  scope?: ContextAssetScope;
  source?: ContextAssetSource;
  status?: ContextAssetStatus;
  assetId?: string;
  sessionId?: string;
  issueLabel?: string;
};

export type AssetsSurfaceState = "loading" | "empty" | "normal" | "selected" | "issue";

const ISSUE_STATUSES = new Set<ContextAssetStatus>(["stale", "conflicted", "orphaned"]);

const DEFAULT_USAGE: ContextAssetUsage = {
  state: "unknown",
  summary: "In-effect data unavailable."
};

export function normalizeContextAssetSubtype(input?: string | null): ContextAssetSubtype {
  if (!input) return "unknown";
  return CONTEXT_ASSET_SUBTYPES.includes(input as ContextAssetSubtype) ? (input as ContextAssetSubtype) : "unknown";
}

export function normalizeContextAssetScope(input?: string | null): ContextAssetScope {
  if (!input) return "unknown";
  return CONTEXT_ASSET_SCOPES.includes(input as ContextAssetScope) ? (input as ContextAssetScope) : "unknown";
}

export function normalizeContextAssetSource(input?: string | null): ContextAssetSource {
  if (!input) return "unknown";
  return CONTEXT_ASSET_SOURCES.includes(input as ContextAssetSource) ? (input as ContextAssetSource) : "unknown";
}

export function normalizeContextAssetStatus(input?: string | null): ContextAssetStatus {
  if (!input) return "unknown";
  return CONTEXT_ASSET_STATUSES.includes(input as ContextAssetStatus) ? (input as ContextAssetStatus) : "unknown";
}

export function normalizeContextAsset(input: ContextAssetInput): ContextAsset {
  const usageState = input.usage?.state ?? "unknown";

  return {
    id: input.id,
    title: input.title,
    subtype: normalizeContextAssetSubtype(input.subtype),
    scope: normalizeContextAssetScope(input.scope),
    source: normalizeContextAssetSource(input.source),
    status: normalizeContextAssetStatus(input.status),
    provenance: input.provenance?.trim() || "Provenance unavailable.",
    ...(input.bodySummary ? { bodySummary: input.bodySummary } : {}),
    ...(input.sourceReference ? { sourceReference: input.sourceReference } : {}),
    usage: {
      ...DEFAULT_USAGE,
      ...input.usage,
      state: usageState === "in_effect" || usageState === "not_in_effect" || usageState === "unknown"
        ? usageState
        : "unknown",
      summary: input.usage?.summary?.trim() || DEFAULT_USAGE.summary
    }
  };
}

export function createDefaultContextAssetFilters(): ContextAssetFilters {
  return {
    subtype: "rule",
    scope: "all",
    source: "all",
    status: "all"
  };
}

export function createContextAssetSeeds(): ContextAsset[] {
  return [
    normalizeContextAsset({
      id: "asset-rule-project-codex",
      title: "Project coding rules",
      subtype: "rule",
      scope: "project",
      source: "codex",
      status: "active",
      provenance: "Extracted from the current project instruction set and linked back to the source session.",
      bodySummary: "Project-specific coding and verification expectations for the current repository.",
      sourceReference: {
        label: "Source session evidence",
        target: "session",
        sessionId: "session-rule-codex-1",
        source: "codex",
        rootId: "root-codex-main"
      },
      usage: {
        state: "in_effect",
        summary: "Currently in effect for this project shell and reused across active sessions.",
        relatedSessionIds: ["session-rule-codex-1"],
        analysisLabel: "Project overview in-effect context"
      }
    }),
    normalizeContextAsset({
      id: "asset-memory-user-windsurf",
      title: "User review preference memory",
      subtype: "memory",
      scope: "user",
      source: "windsurf",
      status: "stale",
      provenance: "Captured from a prior Windsurf review session and awaiting confirmation.",
      bodySummary: "Remember to keep OpenSpec reviews focused on scope, contracts, and regression boundaries.",
      sourceReference: {
        label: "Related session",
        target: "session",
        sessionId: "session-memory-windsurf-2",
        source: "windsurf"
      },
      usage: {
        state: "unknown",
        summary: "Usage data unavailable until deeper adapter support exists.",
        relatedSessionIds: ["session-memory-windsurf-2"],
        analysisLabel: "Missing freshness confirmation"
      }
    }),
    normalizeContextAsset({
      id: "asset-skill-global-generated",
      title: "OpenSpec apply helper skill",
      subtype: "skill",
      scope: "global",
      source: "generated",
      status: "conflicted",
      provenance: "Generated from a canonical skill source, but multiple local copies disagree.",
      bodySummary: "Helper instructions for implementing OpenSpec tasks in order.",
      sourceReference: {
        label: "Review in Analysis",
        target: "analysis"
      },
      usage: {
        state: "not_in_effect",
        summary: "A conflicting copy exists, so this version is not the effective one for the current project.",
        analysisLabel: "Conflicted skill mapping"
      }
    }),
    normalizeContextAsset({
      id: "asset-command-project-antigravity",
      title: "Project validation command template",
      subtype: "command",
      scope: "project",
      source: "antigravity",
      status: "orphaned",
      provenance: "Recovered from local session artifacts without a durable canonical source.",
      bodySummary: "Run focused tests and strict OpenSpec validation before closing a change.",
      sourceReference: {
        label: "Recovered source session",
        target: "session",
        sessionId: "session-command-antigravity-4",
        source: "antigravity"
      },
      usage: {
        state: "not_in_effect",
        summary: "The command is known, but no current project route applies it automatically.",
        relatedSessionIds: ["session-command-antigravity-4"]
      }
    }),
    normalizeContextAsset({
      id: "asset-unknown-imported-1",
      title: "Imported context package fragment",
      subtype: undefined,
      scope: "project",
      source: "imported",
      status: undefined,
      provenance: undefined,
      bodySummary: null,
      usage: null
    }),
    normalizeContextAsset({
      id: "asset-memory-project-codex",
      title: "Project terminology memory",
      subtype: "memory",
      scope: "project",
      source: "codex",
      status: "active",
      provenance: "Derived from accepted glossary and IA decisions for the current product direction.",
      bodySummary: "Use Assets for reusable context assets, Sessions for evidence, Analysis for grouped interpretation.",
      sourceReference: {
        label: "Source session evidence",
        target: "session",
        sessionId: "session-asset-codex-8",
        source: "codex",
        rootId: "root-codex-main"
      },
      usage: {
        state: "in_effect",
        summary: "This terminology is actively reused by the shell foundation and OpenSpec changes.",
        relatedSessionIds: ["session-asset-codex-8"]
      }
    })
  ];
}

export function applyContextAssetFilters(assets: ContextAsset[], filters: ContextAssetFilters): ContextAsset[] {
  return assets.filter((asset) => {
    if (filters.subtype !== "all" && asset.subtype !== filters.subtype) return false;
    if (filters.scope !== "all" && asset.scope !== filters.scope) return false;
    if (filters.source !== "all" && asset.source !== filters.source) return false;
    if (filters.status !== "all" && asset.status !== filters.status) return false;
    return true;
  });
}

export function summarizeContextAssets(assets: ContextAsset[]): ContextAssetSummary {
  const subtypeCounts = Object.fromEntries(CONTEXT_ASSET_SUBTYPES.map((key) => [key, 0])) as Record<ContextAssetSubtype, number>;
  const statusCounts = Object.fromEntries(CONTEXT_ASSET_STATUSES.map((key) => [key, 0])) as Record<ContextAssetStatus, number>;
  let inEffect = 0;
  let issueCount = 0;

  for (const asset of assets) {
    subtypeCounts[asset.subtype] += 1;
    statusCounts[asset.status] += 1;
    if (asset.usage?.state === "in_effect") inEffect += 1;
    if (ISSUE_STATUSES.has(asset.status)) issueCount += 1;
  }

  return {
    total: assets.length,
    inEffect,
    issueCount,
    subtypeCounts,
    statusCounts
  };
}

export function deriveAssetsSurfaceState(input: {
  isLoading: boolean;
  filteredAssets: ContextAsset[];
  selectedAssetId?: string | null;
}): AssetsSurfaceState {
  if (input.isLoading) return "loading";
  if (input.filteredAssets.length === 0) return "empty";

  const selected = input.selectedAssetId
    ? input.filteredAssets.find((asset) => asset.id === input.selectedAssetId)
    : undefined;

  const issueVisible = input.filteredAssets.some((asset) => ISSUE_STATUSES.has(asset.status));
  if (selected && ISSUE_STATUSES.has(selected.status)) return "issue";
  if (issueVisible) return "issue";
  if (selected) return "selected";
  return "normal";
}

export function buildFiltersFromAssetsHandoff(handoff: AssetsHandoff | null, fallback?: ContextAssetFilters | null): ContextAssetFilters {
  return {
    subtype: handoff?.subtype ?? fallback?.subtype ?? "rule",
    scope: handoff?.scope ?? fallback?.scope ?? "all",
    source: handoff?.source ?? fallback?.source ?? "all",
    status: handoff?.status ?? fallback?.status ?? "all"
  };
}

export function resolveContextAssetSelection(assets: ContextAsset[], handoff: AssetsHandoff | null): ContextAsset | null {
  if (!handoff) return null;

  if (handoff.assetId) {
    const byId = assets.find((asset) => asset.id === handoff.assetId);
    if (byId) return byId;
  }

  if (handoff.sessionId) {
    const bySession = assets.find((asset) => asset.sourceReference?.sessionId === handoff.sessionId);
    if (bySession) return bySession;
  }

  return null;
}

export function formatContextAssetSubtypeLabel(subtype: ContextAssetSubtype): string {
  if (subtype === "unknown") return "Unknown";
  return subtype.charAt(0).toUpperCase() + subtype.slice(1);
}

export function formatContextAssetScopeLabel(scope: ContextAssetScope): string {
  if (scope === "unknown") return "Unknown";
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

export function formatContextAssetStatusLabel(status: ContextAssetStatus): string {
  if (status === "unknown") return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatContextAssetSourceLabel(source: ContextAssetSource): string {
  if (source === "antigravity") return "Antigravity";
  if (source === "windsurf") return "Windsurf";
  if (source === "codex") return "Codex";
  if (source === "unknown") return "Unknown";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function isIssueContextAsset(asset: ContextAsset): boolean {
  return ISSUE_STATUSES.has(asset.status);
}
