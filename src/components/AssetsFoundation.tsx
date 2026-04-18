"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  CONTEXT_ASSET_SCOPES,
  CONTEXT_ASSET_SOURCES,
  CONTEXT_ASSET_STATUSES,
  CONTEXT_ASSET_SUBTYPES,
  applyContextAssetFilters,
  buildFiltersFromAssetsHandoff,
  createContextAssetSeeds,
  createDefaultContextAssetFilters,
  deriveContextAssetGovernanceHealth,
  deriveAssetsSurfaceState,
  formatContextAssetScopeLabel,
  formatContextAssetSourceLabel,
  formatContextAssetStatusLabel,
  formatContextAssetSubtypeLabel,
  isIssueContextAsset,
  resolveContextAssetSelection,
  summarizeContextAssets,
  type AssetsHandoff,
  type ContextAsset,
  type ContextAssetFilters,
  type ContextAssetGovernanceSeverity,
  type ContextAssetScope,
  type ContextAssetSource,
  type ContextAssetStatus,
  type ContextAssetSubtype,
} from "@/lib/contextAssets";
import type { Source } from "@/lib/types";

export type AssetsFoundationProps = {
  handoff: AssetsHandoff | null;
  onOpenSession(selection: { sessionId: string; source: Source; rootId?: string }): void;
  onOpenAnalysis(context: { issueLabel: string; assetId?: string; subtype?: ContextAssetSubtype; status?: ContextAssetStatus }): void;
  onOpenBackup(context: { assetId?: string; subtype?: ContextAssetSubtype; workflowType?: "migration-preview" | "project-bundle" }): void;
  onOpenOverview?(): void;
  loadingDelayMs?: number;
};

const LOADING_DELAY_MS = 120;

function CueStrip(props: {
  handoff: AssetsHandoff | null;
  staleSelection: boolean;
  filteredCount: number;
}) {
  if (!props.handoff) return null;

  return (
    <Card className="mb-4 border-accent/30 bg-accent/8 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">routed context</Badge>
            {props.handoff.issueLabel ? <Badge variant="warn">{props.handoff.issueLabel}</Badge> : null}
            <Badge variant="ok">from {props.handoff.origin}</Badge>
          </div>
          <div className="text-sm font-medium">{props.handoff.subtitle}</div>
          <div className="text-xs leading-5 text-muted">
            {props.staleSelection
              ? "The original object could not be selected. Any still-valid filters are preserved so you can continue from the nearest matching context."
              : props.filteredCount === 0
                ? "No reusable assets currently match the routed context. Filters stay visible so you can adjust without losing the original task framing."
                : props.handoff.continueLabel ?? "Continue the routed asset review here."}
          </div>
        </div>
        {props.handoff.returnLabel ? <Badge variant="default">{props.handoff.returnLabel}</Badge> : null}
      </div>
    </Card>
  );
}

function FilterSelect<T extends string>(props: {
  label: string;
  value: T | "all";
  options: readonly T[];
  onChange(value: T | "all"): void;
  formatLabel(value: T | "all"): string;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted">
      <span className="uppercase tracking-[0.18em]">{props.label}</span>
      <Select value={props.value} onChange={(event) => props.onChange(event.target.value as T | "all")}>
        <option value="all">All</option>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {props.formatLabel(option)}
          </option>
        ))}
      </Select>
    </label>
  );
}

function renderStatusBadge(status: ContextAssetStatus) {
  if (status === "active") return <Badge variant="ok">{formatContextAssetStatusLabel(status)}</Badge>;
  if (status === "unknown") return <Badge variant="default">Unknown</Badge>;
  return <Badge variant="warn">{formatContextAssetStatusLabel(status)}</Badge>;
}

function renderSeverityBadge(severity: ContextAssetGovernanceSeverity) {
  if (severity === "healthy") return <Badge variant="ok">healthy</Badge>;
  if (severity === "warning") return <Badge variant="warn">warning</Badge>;
  if (severity === "unknown") return <Badge variant="default">unknown</Badge>;
  return <Badge variant="default">informational</Badge>;
}

export function AssetsFoundation({ handoff, onOpenSession, onOpenAnalysis, onOpenBackup, onOpenOverview, loadingDelayMs = LOADING_DELAY_MS }: AssetsFoundationProps) {
  const assets = useMemo(() => createContextAssetSeeds(), []);
  const initialFilters = buildFiltersFromAssetsHandoff(handoff, createDefaultContextAssetFilters());
  const initialFilteredAssets = applyContextAssetFilters(assets, initialFilters);
  const initialSelectedAsset = resolveContextAssetSelection(initialFilteredAssets, handoff);
  const [filters, setFilters] = useState<ContextAssetFilters>(() =>
    initialFilters
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialSelectedAsset?.id ?? null);
  const [activeHandoff, setActiveHandoff] = useState<AssetsHandoff | null>(handoff);
  const [staleSelection, setStaleSelection] = useState(
    Boolean(handoff?.assetId) && !initialSelectedAsset
  );
  const [isLoading, setIsLoading] = useState(loadingDelayMs > 0);
  const loadingTimeoutRef = useRef<number | null>(null);

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current === null) return;
    window.clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = null;
  }, []);

  const scheduleLoadingComplete = useCallback((callback: () => void) => {
    clearLoadingTimeout();
    if (loadingDelayMs <= 0) {
      callback();
      return;
    }
    loadingTimeoutRef.current = window.setTimeout(() => {
      loadingTimeoutRef.current = null;
      callback();
    }, loadingDelayMs);
  }, [clearLoadingTimeout, loadingDelayMs]);

  useEffect(() => {
    const nextFilters = buildFiltersFromAssetsHandoff(handoff, createDefaultContextAssetFilters());
    setFilters(nextFilters);
    setActiveHandoff(handoff);
    setIsLoading(true);

    scheduleLoadingComplete(() => {
      const filtered = applyContextAssetFilters(assets, nextFilters);
      const selected = resolveContextAssetSelection(filtered, handoff);
      setSelectedAssetId(selected?.id ?? null);
      setStaleSelection(Boolean(handoff?.assetId) && !selected);
      setIsLoading(false);
    });

    return clearLoadingTimeout;
  }, [assets, clearLoadingTimeout, handoff, scheduleLoadingComplete]);

  const filteredAssets = useMemo(() => applyContextAssetFilters(assets, filters), [assets, filters]);
  const selectedAsset = useMemo(
    () => filteredAssets.find((asset) => asset.id === selectedAssetId) ?? null,
    [filteredAssets, selectedAssetId]
  );
  const selectedAssetHealth = useMemo(
    () => selectedAsset ? deriveContextAssetGovernanceHealth(selectedAsset) : null,
    [selectedAsset]
  );
  const summary = useMemo(() => summarizeContextAssets(filteredAssets), [filteredAssets]);
  const surfaceState = deriveAssetsSurfaceState({
    isLoading,
    filteredAssets,
    selectedAssetId,
  });

  function acknowledgeRoutedContext() {
    if (!activeHandoff) return;
    setActiveHandoff(null);
  }

  function updateFilter<K extends keyof ContextAssetFilters>(key: K, value: ContextAssetFilters[K]) {
    acknowledgeRoutedContext();
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedAssetId(null);
    setStaleSelection(false);
    setIsLoading(true);
    scheduleLoadingComplete(() => setIsLoading(false));
  }

  function handleSelectAsset(asset: ContextAsset) {
    if (asset.id !== selectedAssetId) {
      acknowledgeRoutedContext();
    }
    setSelectedAssetId(asset.id);
  }

  return (
    <div className="space-y-4">
      <CueStrip handoff={activeHandoff} staleSelection={staleSelection} filteredCount={filteredAssets.length} />

      <Card className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">reusable context assets</Badge>
              {surfaceState === "issue" ? <Badge variant="warn">issue state</Badge> : null}
              {surfaceState === "empty" ? <Badge variant="default">empty state</Badge> : null}
              {surfaceState === "loading" ? <Badge variant="default">loading</Badge> : null}
            </div>
            <h2 className="text-xl font-semibold">Assets</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted">
              Inspect rules, memory, skills, and commands by subtype, scope, source, status, provenance, and in-effect relevance without turning this page into a generic editor or migration workflow.
            </p>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/8 px-3 py-2 text-xs leading-5 text-muted">
              Foundation data cue: this Assets inventory is backed by local seed/provider-shaped data, not a complete live project scan. Unknown, unavailable, and unsupported evidence remains visible.
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Subtype"
              value={filters.subtype}
              options={CONTEXT_ASSET_SUBTYPES}
              onChange={(value) => updateFilter("subtype", value)}
              formatLabel={(value) => (value === "all" ? "All" : formatContextAssetSubtypeLabel(value))}
            />
            <FilterSelect
              label="Scope"
              value={filters.scope}
              options={CONTEXT_ASSET_SCOPES}
              onChange={(value) => updateFilter("scope", value as ContextAssetScope | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatContextAssetScopeLabel(value as ContextAssetScope))}
            />
            <FilterSelect
              label="Source"
              value={filters.source}
              options={CONTEXT_ASSET_SOURCES}
              onChange={(value) => updateFilter("source", value as ContextAssetSource | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatContextAssetSourceLabel(value as ContextAssetSource))}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              options={CONTEXT_ASSET_STATUSES}
              onChange={(value) => updateFilter("status", value as ContextAssetStatus | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatContextAssetStatusLabel(value as ContextAssetStatus))}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Asset Summary</div>
                <div className="mt-2 text-2xl font-semibold">{summary.total}</div>
                <div className="text-sm text-muted">matching assets in the current context</div>
              </div>
              <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/15 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.18em]">In effect</div>
                  <div className="mt-1 font-semibold text-foreground">{summary.inEffect}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/15 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.18em]">Governance issues</div>
                  <div className="mt-1 font-semibold text-foreground">{summary.issueCount}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {CONTEXT_ASSET_SUBTYPES.map((subtype) => (
                <Badge key={subtype} variant={summary.subtypeCounts[subtype] > 0 ? "ok" : "default"}>
                  {formatContextAssetSubtypeLabel(subtype)} {summary.subtypeCounts[subtype]}
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={summary.governanceIssueCounts.freshness > 0 ? "warn" : "default"}>
                Freshness {summary.governanceIssueCounts.freshness}
              </Badge>
              <Badge variant={summary.governanceIssueCounts.conflict > 0 ? "warn" : "default"}>
                Conflict {summary.governanceIssueCounts.conflict}
              </Badge>
              <Badge variant={summary.governanceIssueCounts.orphaned > 0 ? "warn" : "default"}>
                Orphaned {summary.governanceIssueCounts.orphaned}
              </Badge>
              <Badge variant="default">
                Unknown {summary.governanceIssueCounts.unknown}
              </Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              No known issue count means no stale, conflicted, orphaned, or unknown asset in the filtered seed/provider inventory; it does not prove every local runtime has been scanned.
            </p>
            {surfaceState === "issue" ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/8 px-3 py-3 text-sm text-muted">
                <div>
                  The current inventory contains warning-class assets. Use Analysis for grouped interpretation when object-level inspection is not enough.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onOpenAnalysis({
                      issueLabel: activeHandoff?.issueLabel ?? "Reusable asset issue",
                      assetId: selectedAsset?.id,
                      subtype: filters.subtype === "all" ? undefined : filters.subtype,
                      status: filters.status === "all" ? undefined : filters.status,
                    })
                  }
                >
                  Route to Analysis
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Asset Inventory</div>
                <div className="text-sm text-muted">Subtype, scope, source, status, and provenance stay visible while you browse.</div>
              </div>
              {selectedAsset ? <Badge variant="default">selected detail active</Badge> : null}
            </div>

            {surfaceState === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-border/60 bg-background/12 px-3 py-4 text-sm text-muted">
                    Loading asset inventory…
                  </div>
                ))}
              </div>
            ) : null}

            {surfaceState === "empty" ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/10 px-4 py-5">
                <div className="text-sm font-medium text-foreground">No reusable assets match the current subtype and filter context.</div>
                <div className="mt-2 text-sm leading-6 text-muted">
                  Keep the active context visible, then switch subtype or scope, review sessions for promotable material, or route to import preparation when you need a different source boundary.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateFilter("scope", "all")}>
                    Clear scope filter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpenBackup({ subtype: filters.subtype === "all" ? undefined : filters.subtype, workflowType: "project-bundle" })}>
                    Open Project Bundle
                  </Button>
                </div>
              </div>
            ) : null}

            {surfaceState !== "loading" && surfaceState !== "empty" ? (
              <div className="space-y-3">
                {filteredAssets.map((asset) => {
                  const selected = asset.id === selectedAssetId;
                  const health = deriveContextAssetGovernanceHealth(asset);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleSelectAsset(asset)}
                      aria-pressed={selected}
                      aria-label={`${selected ? "Selected asset" : "Select asset"}: ${asset.title}`}
                      className={[
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-accent/55 bg-accent/10"
                          : "border-border/60 bg-background/10 hover:border-accent/35 hover:bg-background/16",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-foreground">{asset.title}</div>
                            <Badge variant="default">{formatContextAssetSubtypeLabel(asset.subtype)}</Badge>
                            {renderStatusBadge(asset.status)}
                            {renderSeverityBadge(health.severity)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                            <span>{formatContextAssetScopeLabel(asset.scope)}</span>
                            <span>{formatContextAssetSourceLabel(asset.source)}</span>
                            <span>{asset.provenance}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {asset.usage.state === "in_effect" ? <Badge variant="ok">in effect</Badge> : null}
                          {isIssueContextAsset(asset) ? <Badge variant="warn">needs attention</Badge> : null}
                          {health.severity === "unknown" ? <Badge variant="default">non-blocking unknown</Badge> : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Asset Detail</div>
                <div className="text-sm text-muted">Object understanding stays bounded to identity, applicability, provenance, and related routes.</div>
              </div>
              {selectedAsset ? <Badge variant="ok">{formatContextAssetSubtypeLabel(selectedAsset.subtype)}</Badge> : null}
            </div>

            {selectedAsset ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{selectedAsset.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="default">{formatContextAssetScopeLabel(selectedAsset.scope)}</Badge>
                    <Badge variant="default">{formatContextAssetSourceLabel(selectedAsset.source)}</Badge>
                    {renderStatusBadge(selectedAsset.status)}
                    {selectedAssetHealth ? renderSeverityBadge(selectedAssetHealth.severity) : null}
                  </div>
                </div>

                {selectedAsset.bodySummary ? (
                  <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm leading-6 text-muted">
                    {selectedAsset.bodySummary}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm text-muted">
                    No body summary is available for this asset yet.
                  </div>
                )}

                <div className="space-y-2 rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Governance Health</div>
                  <div className="leading-6 text-muted">{selectedAssetHealth?.explanation}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedAssetHealth?.issueClass === "none" ? "ok" : selectedAssetHealth?.issueClass === "unknown" ? "default" : "warn"}>
                      issue class: {selectedAssetHealth?.issueClass}
                    </Badge>
                    <Badge variant="default">route owner: {selectedAssetHealth?.recommendedRoute.owner}</Badge>
                  </div>
                  <div className="text-xs leading-5 text-muted">{selectedAssetHealth?.recommendedRoute.reason}</div>
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Provenance</div>
                  <div className="leading-6 text-muted">{selectedAssetHealth?.provenanceExplanation}</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedAsset.sourceReference?.target === "session" || selectedAsset.sourceReference?.target === "source") && selectedAsset.sourceReference.sessionId && selectedAsset.sourceReference.source ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onOpenSession({
                            sessionId: selectedAsset.sourceReference!.sessionId!,
                            source: selectedAsset.sourceReference!.source!,
                            rootId: selectedAsset.sourceReference?.rootId,
                          })
                        }
                      >
                        Route to Sessions: {selectedAsset.sourceReference.label}
                      </Button>
                    ) : null}
                    {selectedAsset.sourceReference?.target === "analysis" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onOpenAnalysis({
                            issueLabel: activeHandoff?.issueLabel ?? "Reusable asset issue",
                            assetId: selectedAsset.id,
                            subtype: selectedAsset.subtype,
                            status: selectedAsset.status,
                          })
                        }
                      >
                        Route to Analysis: {selectedAsset.sourceReference.label}
                      </Button>
                    ) : null}
                    {selectedAssetHealth?.recommendedRoute.target === "overview" && onOpenOverview ? (
                      <Button size="sm" variant="outline" onClick={onOpenOverview}>
                        Route to Project Overview: review governance context
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onOpenBackup({ assetId: selectedAsset.id, subtype: selectedAsset.subtype, workflowType: "migration-preview" })}>
                    Route to Backup / Migration: preview scope
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpenBackup({ assetId: selectedAsset.id, subtype: selectedAsset.subtype, workflowType: "project-bundle" })}>
                    Route to Backup / Migration: project bundle
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/10 px-4 py-6 text-sm text-muted">
                Select an asset to inspect identity, scope, source, status, provenance, and bounded evidence routes.
              </div>
            )}
          </Card>

          {selectedAsset ? (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">In-Effect / Usage</div>
                  <div className="text-sm text-muted">Explain whether and how this asset matters in the current project.</div>
                </div>
                {selectedAsset.usage.state === "in_effect" ? <Badge variant="ok">in effect</Badge> : null}
                {selectedAsset.usage.state === "not_in_effect" ? <Badge variant="warn">not in effect</Badge> : null}
                {selectedAsset.usage.state === "unknown" ? <Badge variant="default">unavailable</Badge> : null}
              </div>
              <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm leading-6 text-muted">
                {selectedAssetHealth?.inEffectExplanation}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedAsset.sourceReference?.target === "session" || selectedAsset.sourceReference?.target === "source") && selectedAsset.sourceReference.sessionId && selectedAsset.sourceReference.source ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onOpenSession({
                        sessionId: selectedAsset.sourceReference!.sessionId!,
                        source: selectedAsset.sourceReference!.source!,
                        rootId: selectedAsset.sourceReference?.rootId,
                      })
                    }
                  >
                    Route to Sessions: review related session
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onOpenAnalysis({
                      issueLabel: selectedAsset.usage.analysisLabel ?? activeHandoff?.issueLabel ?? "Reusable asset usage",
                      assetId: selectedAsset.id,
                      subtype: selectedAsset.subtype,
                      status: selectedAsset.status,
                    })
                  }
                >
                  Route to Analysis: review usage context
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AssetsFoundation;
