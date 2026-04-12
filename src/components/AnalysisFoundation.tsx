"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  ANALYSIS_FINDING_STATUSES,
  ANALYSIS_ISSUE_CLASSES,
  ANALYSIS_OBJECT_TYPES,
  ANALYSIS_SEVERITIES,
  applyAnalysisFilters,
  buildAssetsHandoffFromAnalysisRoute,
  buildFiltersFromAnalysisHandoff,
  createAnalysisFindingSeeds,
  createDefaultAnalysisFilters,
  deriveAnalysisSurfaceState,
  formatAnalysisFindingStatusLabel,
  formatAnalysisIssueClassLabel,
  formatAnalysisObjectTypeLabel,
  formatAnalysisSeverityLabel,
  resolveAnalysisFindingSelection,
  resolveAnalysisSessionRootId,
  summarizeAnalysisFindings,
  type AnalysisFinding,
  type AnalysisFindingStatus,
  type AnalysisFilters,
  type AnalysisHandoff,
  type AnalysisIssueClass,
  type AnalysisObjectType,
  type AnalysisRoute,
  type AnalysisSeverity,
} from "@/lib/analysisFindings";
import type { AssetsHandoff } from "@/lib/contextAssets";
import type { Source } from "@/lib/types";

export type AnalysisFoundationProps = {
  handoff: AnalysisHandoff | null;
  onOpenAssets(handoff: AssetsHandoff): void;
  onOpenBackup(context: { findingId: string; title: string; preservationWarning?: string; routeLabel?: string }): void;
  onOpenOverview(): void;
  onOpenSession(selection: { sessionId: string; source: Source; rootId?: string }): void;
  loadingDelayMs?: number;
};

const LOADING_DELAY_MS = 120;

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

function renderSeverityBadge(severity: AnalysisSeverity) {
  if (severity === "high") return <Badge variant="warn">High</Badge>;
  if (severity === "unknown") return <Badge variant="default">Unknown</Badge>;
  return <Badge variant={severity === "low" ? "ok" : "default"}>{formatAnalysisSeverityLabel(severity)}</Badge>;
}

function CueStrip(props: {
  handoff: AnalysisHandoff | null;
  staleSelection: boolean;
  filteredCount: number;
}) {
  if (!props.handoff) return null;

  return (
    <Card className="border-accent/30 bg-accent/8 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">routed analysis</Badge>
            <Badge variant="ok">from {props.handoff.origin}</Badge>
            {props.handoff.issueClass ? <Badge variant="warn">{formatAnalysisIssueClassLabel(props.handoff.issueClass)}</Badge> : null}
          </div>
          <div className="text-sm font-medium">{props.handoff.subtitle}</div>
          <div className="text-xs leading-5 text-muted">
            {props.staleSelection
              ? "The original routed context could not be selected. Any still-valid issue or object filters are preserved so the routed task can degrade safely."
              : props.filteredCount === 0
                ? "No findings currently match the routed context. Filters stay visible so you can adjust without losing the original task framing."
                : props.handoff.continueLabel ?? "Continue interpreting the routed issue context here."}
          </div>
        </div>
        {props.handoff.returnLabel ? <Badge variant="default">{props.handoff.returnLabel}</Badge> : null}
      </div>
    </Card>
  );
}

function RouteButton(props: {
  finding: AnalysisFinding;
  route: AnalysisRoute;
  handoff: AnalysisHandoff | null;
  onOpenAssets(handoff: AssetsHandoff): void;
  onOpenBackup(context: { findingId: string; title: string; preservationWarning?: string; routeLabel?: string }): void;
  onOpenOverview(): void;
  onOpenSession(selection: { sessionId: string; source: Source; rootId?: string }): void;
}) {
  if (props.route.target === "assets" && props.route.assetId) {
    return (
      <Button size="sm" variant="outline" onClick={() => props.onOpenAssets(buildAssetsHandoffFromAnalysisRoute(props.route, props.finding))}>
        {props.route.label}
      </Button>
    );
  }

  if (props.route.target === "sessions" && props.route.sessionId && props.route.source) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          props.onOpenSession({
            sessionId: props.route.sessionId!,
            source: props.route.source!,
            rootId: resolveAnalysisSessionRootId({
              handoff: props.handoff,
              sessionId: props.route.sessionId!,
              source: props.route.source!,
              explicitRootId: props.route.rootId,
            }),
          })
        }
      >
        {props.route.label}
      </Button>
    );
  }

  if (props.route.target === "backup") {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          props.onOpenBackup({
            findingId: props.finding.id,
            title: props.finding.title,
            preservationWarning: props.route.preservationWarning ?? props.finding.preservationWarning,
            routeLabel: props.route.label,
          })
        }
      >
        {props.route.label}
      </Button>
    );
  }

  if (props.route.target === "overview") {
    return (
      <Button size="sm" variant="outline" onClick={props.onOpenOverview}>
        {props.route.label}
      </Button>
    );
  }

  return (
    <Badge variant="default">
      {props.route.label}: unavailable route context
    </Badge>
  );
}

export function AnalysisFoundation({
  handoff,
  onOpenAssets,
  onOpenBackup,
  onOpenOverview,
  onOpenSession,
  loadingDelayMs = LOADING_DELAY_MS,
}: AnalysisFoundationProps) {
  const findings = useMemo(() => createAnalysisFindingSeeds(), []);
  const initialFilters = buildFiltersFromAnalysisHandoff(handoff, createDefaultAnalysisFilters());
  const initialFilteredFindings = applyAnalysisFilters(findings, initialFilters);
  const initialSelectedFinding = resolveAnalysisFindingSelection(initialFilteredFindings, handoff);
  const [filters, setFilters] = useState<AnalysisFilters>(() => initialFilters);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(initialSelectedFinding?.id ?? null);
  const [activeHandoff, setActiveHandoff] = useState<AnalysisHandoff | null>(handoff);
  const [staleSelection, setStaleSelection] = useState(Boolean(handoff?.findingId || handoff?.assetId || handoff?.sessionId) && !initialSelectedFinding);
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
    const nextFilters = buildFiltersFromAnalysisHandoff(handoff, createDefaultAnalysisFilters());
    setFilters(nextFilters);
    setActiveHandoff(handoff);
    setIsLoading(true);

    scheduleLoadingComplete(() => {
      const filtered = applyAnalysisFilters(findings, nextFilters);
      const selected = resolveAnalysisFindingSelection(filtered, handoff);
      setSelectedFindingId(selected?.id ?? null);
      setStaleSelection(Boolean(handoff?.findingId || handoff?.assetId || handoff?.sessionId) && !selected);
      setIsLoading(false);
    });

    return clearLoadingTimeout;
  }, [clearLoadingTimeout, findings, handoff, scheduleLoadingComplete]);

  const filteredFindings = useMemo(() => applyAnalysisFilters(findings, filters), [filters, findings]);
  const selectedFinding = useMemo(
    () => filteredFindings.find((finding) => finding.id === selectedFindingId) ?? null,
    [filteredFindings, selectedFindingId]
  );
  const summary = useMemo(() => summarizeAnalysisFindings(filteredFindings), [filteredFindings]);
  const surfaceState = deriveAnalysisSurfaceState({
    isLoading,
    filteredFindings,
    selectedFindingId,
  });

  function acknowledgeRoutedContext() {
    if (!activeHandoff) return;
    setActiveHandoff(null);
  }

  function updateFilter<K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) {
    acknowledgeRoutedContext();
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedFindingId(null);
    setStaleSelection(false);
    setIsLoading(true);
    scheduleLoadingComplete(() => setIsLoading(false));
  }

  function handleSelectFinding(finding: AnalysisFinding) {
    if (finding.id !== selectedFindingId) {
      acknowledgeRoutedContext();
    }
    setSelectedFindingId(finding.id);
  }

  return (
    <div className="space-y-4">
      <CueStrip handoff={activeHandoff} staleSelection={staleSelection} filteredCount={filteredFindings.length} />

      <Card className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">interpretation and routing</Badge>
              {surfaceState === "issue-heavy" ? <Badge variant="warn">issue-heavy state</Badge> : null}
              {surfaceState === "empty" ? <Badge variant="default">empty state</Badge> : null}
              {surfaceState === "loading" ? <Badge variant="default">loading</Badge> : null}
              {activeHandoff ? <Badge variant="ok">routed-in</Badge> : null}
            </div>
            <h2 className="text-xl font-semibold">Analysis</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted">
              Interpret local context issues, preserve evidence boundaries, and route each finding to the owning surface. This foundation does not claim automatic fixes, asset editing, session mutation, or backup execution.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Issue class"
              value={filters.issueClass}
              options={ANALYSIS_ISSUE_CLASSES}
              onChange={(value) => updateFilter("issueClass", value as AnalysisIssueClass | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatAnalysisIssueClassLabel(value as AnalysisIssueClass))}
            />
            <FilterSelect
              label="Severity"
              value={filters.severity}
              options={ANALYSIS_SEVERITIES}
              onChange={(value) => updateFilter("severity", value as AnalysisSeverity | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatAnalysisSeverityLabel(value as AnalysisSeverity))}
            />
            <FilterSelect
              label="Object"
              value={filters.objectType}
              options={ANALYSIS_OBJECT_TYPES}
              onChange={(value) => updateFilter("objectType", value as AnalysisObjectType | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatAnalysisObjectTypeLabel(value as AnalysisObjectType))}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              options={ANALYSIS_FINDING_STATUSES}
              onChange={(value) => updateFilter("status", value as AnalysisFindingStatus | "all")}
              formatLabel={(value) => (value === "all" ? "All" : formatAnalysisFindingStatusLabel(value as AnalysisFindingStatus))}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Context Health Summary</div>
                <div className="mt-2 text-2xl font-semibold">{summary.total}</div>
                <div className="text-sm text-muted">matching findings in the current context</div>
              </div>
              <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/15 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.18em]">High severity</div>
                  <div className="mt-1 font-semibold text-foreground">{summary.highSeverity}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/15 px-3 py-2">
                  <div className="text-xs uppercase tracking-[0.18em]">Preservation</div>
                  <div className="mt-1 font-semibold text-foreground">{summary.preservationSensitive}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ANALYSIS_ISSUE_CLASSES.map((issueClass) => (
                <Badge key={issueClass} variant={summary.issueClassCounts[issueClass] > 0 ? "ok" : "default"}>
                  {formatAnalysisIssueClassLabel(issueClass)} {summary.issueClassCounts[issueClass]}
                </Badge>
              ))}
            </div>
            {surfaceState === "issue-heavy" ? (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/8 px-3 py-3 text-sm leading-6 text-muted">
                High-severity or preservation-sensitive context is present. Use the selected finding detail and recommended routes to move work to Sessions, Assets, or Backup / Migration without executing remediation here.
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Findings Inventory</div>
                <div className="text-sm text-muted">Findings are local seed interpretations for routing validation, not complete automated analysis.</div>
              </div>
              {selectedFinding ? <Badge variant="default">selected finding active</Badge> : null}
            </div>

            {surfaceState === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-border/60 bg-background/12 px-3 py-4 text-sm text-muted">
                    Loading analysis findings…
                  </div>
                ))}
              </div>
            ) : null}

            {surfaceState === "empty" ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/10 px-4 py-5">
                <div className="text-sm font-medium text-foreground">No findings match the current issue and object context.</div>
                <div className="mt-2 text-sm leading-6 text-muted">
                  Keep the active context visible, then change filters, inspect sessions for evidence, or review reusable assets before escalating into workflow surfaces.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateFilter("issueClass", "all")}>
                    Clear issue filter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateFilter("status", "all")}>
                    Include resolved / unknown
                  </Button>
                </div>
              </div>
            ) : null}

            {surfaceState !== "loading" && surfaceState !== "empty" ? (
              <div className="space-y-3">
                {filteredFindings.map((finding) => {
                  const selected = finding.id === selectedFindingId;
                  return (
                    <button
                      key={finding.id}
                      type="button"
                      onClick={() => handleSelectFinding(finding)}
                      aria-pressed={selected}
                      aria-label={`${selected ? "Selected finding" : "Select finding"}: ${finding.title}`}
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
                            <div className="font-medium text-foreground">{finding.title}</div>
                            <Badge variant="default">{formatAnalysisIssueClassLabel(finding.issueClass)}</Badge>
                            {renderSeverityBadge(finding.severity)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                            <span>{formatAnalysisObjectTypeLabel(finding.affectedObjectType)}</span>
                            <span>{finding.affectedObjectLabel}</span>
                            <span>{formatAnalysisFindingStatusLabel(finding.status)}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {finding.preservationWarning ? <Badge variant="warn">preserve first</Badge> : null}
                          {finding.routes.length > 0 ? <Badge variant="ok">{finding.routes.length} routes</Badge> : <Badge variant="default">no route</Badge>}
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
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Finding Detail</div>
                <div className="text-sm text-muted">Explain the problem before offering outbound action routes.</div>
              </div>
              {selectedFinding ? renderSeverityBadge(selectedFinding.severity) : null}
            </div>

            {selectedFinding ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{selectedFinding.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="default">{formatAnalysisIssueClassLabel(selectedFinding.issueClass)}</Badge>
                    <Badge variant="default">{formatAnalysisObjectTypeLabel(selectedFinding.affectedObjectType)}</Badge>
                    <Badge variant="default">{formatAnalysisFindingStatusLabel(selectedFinding.status)}</Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm leading-6 text-muted">
                  {selectedFinding.whyItMatters}
                </div>

                {selectedFinding.preservationWarning ? (
                  <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-3 text-sm leading-6 text-muted">
                    <span className="font-medium text-foreground">Preservation warning:</span> {selectedFinding.preservationWarning}
                  </div>
                ) : null}

                <div className="space-y-2 rounded-xl border border-border/60 bg-background/10 px-3 py-3 text-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Evidence Context</div>
                  {selectedFinding.evidence.length > 0 ? (
                    <div className="space-y-2">
                      {selectedFinding.evidence.map((evidence, index) => (
                        <div key={`${evidence.label}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/15 px-3 py-2">
                          <div>
                            <div className="font-medium text-foreground">{evidence.label}</div>
                            <div className="text-xs text-muted">{evidence.target}</div>
                          </div>
                          {evidence.target === "session" && evidence.sessionId && evidence.source ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onOpenSession({
                                  sessionId: evidence.sessionId!,
                                  source: evidence.source!,
                                  rootId: resolveAnalysisSessionRootId({
                                    handoff: activeHandoff,
                                    sessionId: evidence.sessionId!,
                                    source: evidence.source!,
                                    explicitRootId: evidence.rootId,
                                  }),
                                })
                              }
                            >
                              Open evidence
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">Evidence reference unavailable.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/10 px-4 py-6 text-sm text-muted">
                Select a finding to inspect issue class, severity, affected object, evidence, and bounded outbound routes.
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Recommended Actions</div>
                <div className="text-sm text-muted">Actions route to owning pages; Analysis does not execute fixes inline.</div>
              </div>
              {selectedFinding?.routes.length ? <Badge variant="ok">route-only</Badge> : null}
            </div>

            {selectedFinding ? (
              selectedFinding.routes.length > 0 ? (
                <div className="space-y-3">
                  {selectedFinding.routes.map((route, index) => (
                    <div key={`${route.target}-${index}`} className="rounded-xl border border-border/60 bg-background/10 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">{route.label}</div>
                            <Badge variant="default">{route.target}</Badge>
                            {route.preservationWarning ? <Badge variant="warn">preserve first</Badge> : null}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-muted">{route.reason}</div>
                        </div>
                        <RouteButton
                          finding={selectedFinding}
                          route={route}
                          onOpenAssets={onOpenAssets}
                          onOpenBackup={onOpenBackup}
                          onOpenOverview={onOpenOverview}
                          onOpenSession={onOpenSession}
                          handoff={activeHandoff}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/10 px-4 py-5 text-sm text-muted">
                  No outbound route is available yet. Keep this finding as interpretation only until a concrete owner surface exists.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/10 px-4 py-5 text-sm text-muted">
                Select a finding to show route-only actions to Sessions, Assets, or Backup / Migration.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AnalysisFoundation;
